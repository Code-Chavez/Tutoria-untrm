import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { User } from '@domain/entities/User';
import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';
import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { ListOwnTutoringRequestsUseCase, ListTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';
import { GetOwnRequestRecipientUseCase } from '@application/use-cases/tutoring-requests/GetOwnRequestRecipientUseCase';

export type KpiTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface HomeKpi {
  key: string;
  label: string;
  value: string;
  hint?: string;
  tone: KpiTone;
  /** Ruta de la vista de detalle. */
  link?: string;
}

export interface HomePanel {
  role: string;
  periodName: string | null;
  kpis: HomeKpi[];
}

const formatDateTime = (date: Date) =>
  date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Cada contador abre su bandeja ya filtrada (?estado=…): quien ve «Por recibir: 1» llega a ese caso, no a la lista general.
const REFERRALS_LINK = '/derivaciones';
const REQUESTS_PENDING_LINK = '/solicitudes?estado=por-atender';

/** «hace 3 días» desde una fecha (sin plazos de vencimiento: eso lo acuerda la DBU). */
const waitingSince = (date: Date, now: Date) => {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  return days <= 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`;
};

/**
 * Indicadores del panel de inicio según el rol (HU-49): cada rol ve solo lo
 * que le sirve para su trabajo diario. Se calcula al vuelo con lo ya
 * registrado y reutiliza los casos de uso de indicadores y alertas, de modo
 * que respeta el mismo alcance (un Coordinador solo ve sus escuelas).
 */
export class GetHomePanelUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly students: StudentRepository,
    private readonly sessions: SessionRepository,
    private readonly referrals: StudentReferralRepository,
    private readonly indicators: GetIndicatorsUseCase,
    private readonly riskAlerts: GetRiskAlertsUseCase,
    private readonly evaluationStatus: GetEvaluationStatusUseCase,
    /** Bandeja de solicitudes (mismo alcance que la pantalla), para el contador «Solicitudes por atender». */
    private readonly requestInbox?: ListTutoringRequestsUseCase,
    /** Solicitudes del propio estudiante y a quién llegarán, para su panel. */
    private readonly ownRequests?: ListOwnTutoringRequestsUseCase,
    private readonly requestRecipient?: GetOwnRequestRecipientUseCase,
  ) {}

  async execute(userId: string): Promise<HomePanel> {
    const user = await this.users.findById(userId);
    const role = user ? await this.roles.findById(user.roleId) : null;
    if (!user || !role) return { role: '', periodName: null, kpis: [] };

    const period = await this.periods.findActive();
    const base = { role: role.name, periodName: period?.name ?? null };

    switch (role.name) {
      case 'Docente Tutor':
        return { ...base, kpis: await this.tutorKpis(user) };
      case 'Coordinador':
      case 'Administrador DBU':
      case 'Vicerrectorado':
        return { ...base, kpis: await this.managementKpis(userId, role.name) };
      case 'Profesional de Servicio':
        return { ...base, kpis: await this.serviceKpis(user) };
      case 'Tutorado':
        return { ...base, kpis: await this.studentKpis(userId) };
      default:
        return { ...base, kpis: [] };
    }
  }

  private async tutorKpis(user: User): Promise<HomeKpi[]> {
    const now = new Date();
    const [myStudents, mySessions, alerts, myReferrals] = await Promise.all([
      this.students.findAll({ tutorId: user.id, isActive: true }),
      this.sessions.findAll({ tutorId: user.id }),
      this.riskAlerts.execute({ tutorId: user.id }),
      this.referrals.findMany({ referredById: user.id }),
    ]);
    const requestsKpi = await this.pendingRequestsKpi(user.id);

    const upcoming = mySessions
      .filter((s) => !s.cancelledAt && s.scheduledAt >= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const atRisk = myStudents.filter((s) => s.isAtRisk).length;
    const openReferrals = myReferrals.filter((r) => r.status !== 'CERRADO').length;

    return [
      { key: 'my-students', label: 'Mis tutorados', value: String(myStudents.length), hint: `${atRisk} en riesgo`, tone: 'info', link: '/tutorados' },
      { key: 'upcoming-sessions', label: 'Sesiones próximas', value: String(upcoming.length), hint: upcoming[0] ? `Siguiente: ${formatDateTime(upcoming[0].scheduledAt)}` : 'Sin sesiones programadas', tone: 'success', link: '/sesiones' },
      { key: 'alerts', label: 'Alertas pendientes', value: String(alerts.length), hint: 'Riesgo sin sesiones o con inasistencias', tone: alerts.length > 0 ? 'warning' : 'neutral' },
      ...(requestsKpi ? [requestsKpi] : []),
      { key: 'open-referrals', label: 'Derivaciones abiertas', value: String(openReferrals), hint: 'Casos que derivaste y siguen en trámite', tone: 'neutral', link: `${REFERRALS_LINK}?estado=abiertas` },
    ];
  }

  // DBU, Vicerrectorado y Coordinador: los mismos indicadores del tablero, ya acotados por rol.
  private async managementKpis(userId: string, roleName: string): Promise<HomeKpi[]> {
    let report;
    try {
      report = await this.indicators.execute(userId);
    } catch {
      // Sin periodo activo no hay indicadores que mostrar.
      return [];
    }
    // Quien recibe solicitudes (coordinación y DBU) ve primero lo que espera respuesta.
    const requestsKpi = roleName === 'Vicerrectorado' ? null : await this.pendingRequestsKpi(userId);
    return [
      ...(requestsKpi ? [requestsKpi] : []),
      { key: 'students', label: 'Tutorados activos', value: String(report.students.active), hint: `${report.students.assignedPct}% con tutor asignado`, tone: 'info', link: '/indicadores' },
      { key: 'coverage', label: 'Cobertura de sesiones', value: `${report.sessions.coveragePct}%`, hint: `${report.sessions.studentsServed} tutorados atendidos`, tone: 'success', link: '/indicadores' },
      { key: 'risk', label: 'Tutorados en riesgo', value: `${report.risk.atRiskPct}%`, hint: `${report.risk.atRisk} de ${report.students.active}`, tone: 'danger', link: '/indicadores' },
      { key: 'referrals', label: 'Derivaciones del periodo', value: String(report.referrals.total), tone: 'warning', link: '/indicadores' },
      {
        key: 'evaluation',
        label: 'Evaluación de tutores',
        value: report.evaluation.averageScore === null ? '—' : `${report.evaluation.averageScore} / 5`,
        hint: plural(report.evaluation.responses, 'respuesta', 'respuestas'),
        tone: 'neutral',
        link: '/indicadores',
      },
    ];
  }

  /** Solicitudes de tutoría que esperan respuesta (pendientes o en atención), con la espera más antigua. */
  private async pendingRequestsKpi(userId: string): Promise<HomeKpi | null> {
    if (!this.requestInbox) return null;
    const waiting = (await this.requestInbox.execute(userId)).filter((r) => r.status !== 'ATENDIDA');
    const oldest = waiting.reduce<Date | null>((acc, r) => (acc === null || r.createdAt < acc ? r.createdAt : acc), null);
    return {
      key: 'pending-requests',
      label: 'Solicitudes por atender',
      value: String(waiting.length),
      hint: oldest ? `La más antigua espera desde ${waitingSince(oldest, new Date())}` : 'No hay solicitudes esperando respuesta',
      tone: waiting.length > 0 ? 'warning' : 'neutral',
      link: REQUESTS_PENDING_LINK,
    };
  }

  private async serviceKpis(user: User): Promise<HomeKpi[]> {
    if (!user.service) {
      return [{ key: 'no-service', label: 'Servicio asignado', value: '—', hint: 'Tu cuenta no tiene un servicio asignado', tone: 'neutral' }];
    }
    const received = await this.referrals.findMany({ service: user.service });
    const count = (status: string) => received.filter((r) => r.status === status).length;
    return [
      { key: 'to-receive', label: 'Por recibir', value: String(count('ENVIADO')), hint: 'Derivaciones enviadas a tu servicio', tone: count('ENVIADO') > 0 ? 'warning' : 'neutral', link: `${REFERRALS_LINK}?estado=por-recibir` },
      { key: 'in-care', label: 'En atención', value: String(count('RECIBIDO') + count('EN_ATENCION')), tone: 'info', link: `${REFERRALS_LINK}?estado=en-tramite` },
      { key: 'attended', label: 'Atendidas', value: String(count('ATENDIDO')), tone: 'success', link: `${REFERRALS_LINK}?estado=atendidos` },
      { key: 'closed', label: 'Cerradas', value: String(count('CERRADO')), tone: 'neutral', link: `${REFERRALS_LINK}?estado=cerrados` },
    ];
  }

  private async studentKpis(userId: string): Promise<HomeKpi[]> {
    const student = await this.students.findByUserId(userId);
    if (!student) {
      return [{ key: 'no-profile', label: 'Mi perfil de tutorado', value: '—', hint: 'Tu cuenta aún no está vinculada a un tutorado', tone: 'neutral' }];
    }

    const tutor = student.tutorId ? await this.users.findById(student.tutorId) : null;
    const now = new Date();
    const next = (await this.sessions.findByStudent(student.id))
      .filter((s) => !s.cancelledAt && s.scheduledAt >= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
    const status = await this.evaluationStatus.execute(userId).catch(() => null);

    const evaluation = !status
      ? { value: '—', hint: undefined, tone: 'neutral' as KpiTone }
      : status.alreadyResponded
        ? { value: 'Respondida', hint: 'Gracias por tu opinión', tone: 'success' as KpiTone }
        : status.canRespond
          ? { value: 'Pendiente', hint: 'Evalúa a tu tutor de forma anónima', tone: 'warning' as KpiTone }
          : { value: 'No disponible', hint: 'Aún no está habilitada para tu escuela', tone: 'neutral' as KpiTone };

    // A quién llegan sus solicitudes: su tutor, o, si aún no tiene, quien las recibe en su lugar (no queda sin saber qué hacer).
    const recipient = !tutor && this.requestRecipient ? await this.requestRecipient.execute(userId) : null;
    const recipientText = recipient ? (recipient.kind === 'coordinator' ? `la coordinación de tu escuela (${recipient.name})` : recipient.kind === 'dbu' ? `Bienestar Universitario (${recipient.name})` : recipient.name) : null;
    const open = this.ownRequests ? (await this.ownRequests.execute(userId)).filter((r) => r.status !== 'ATENDIDA') : null;
    const requestsKpi: HomeKpi | null = open
      ? {
          key: 'my-requests',
          label: 'Mis solicitudes',
          value: open.length === 0 ? 'Ninguna pendiente' : plural(open.length, 'esperando respuesta', 'esperando respuesta'),
          hint: open.length === 0 ? (recipientText ? `Si necesitas ayuda, tu solicitud la recibirá ${recipientText}` : 'Si necesitas ayuda, pide tutoría') : `Te avisaremos en cuanto ${open[0].routedToName} responda`,
          tone: open.length > 0 ? 'warning' : 'neutral',
          link: '/solicitar-tutoria',
        }
      : null;

    return [
      { key: 'my-tutor', label: 'Mi tutor', value: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Sin asignar', hint: tutor ? undefined : recipientText ? `Mientras tanto, tus solicitudes las recibe ${recipientText}` : undefined, tone: 'info' },
      { key: 'next-session', label: 'Próxima sesión', value: next ? formatDateTime(next.scheduledAt) : '—', hint: next ? next.topic : 'No tienes sesiones programadas', tone: 'success', link: '/mis-sesiones' },
      ...(requestsKpi ? [requestsKpi] : []),
      { key: 'evaluation', label: 'Evaluación de mi tutor', ...evaluation, link: status?.canRespond && !status.alreadyResponded ? '/evaluar-tutoria' : undefined },
    ];
  }
}
