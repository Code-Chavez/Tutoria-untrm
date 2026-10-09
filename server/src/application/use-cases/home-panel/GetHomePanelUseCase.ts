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
        return { ...base, kpis: await this.managementKpis(userId) };
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

    const upcoming = mySessions
      .filter((s) => !s.cancelledAt && s.scheduledAt >= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const atRisk = myStudents.filter((s) => s.isAtRisk).length;
    const openReferrals = myReferrals.filter((r) => r.status !== 'CERRADO').length;

    return [
      { key: 'my-students', label: 'Mis tutorados', value: String(myStudents.length), hint: `${atRisk} en riesgo`, tone: 'info', link: '/tutorados' },
      { key: 'upcoming-sessions', label: 'Sesiones próximas', value: String(upcoming.length), hint: upcoming[0] ? `Siguiente: ${formatDateTime(upcoming[0].scheduledAt)}` : 'Sin sesiones programadas', tone: 'success', link: '/sesiones' },
      { key: 'alerts', label: 'Alertas pendientes', value: String(alerts.length), hint: 'Riesgo sin sesiones o con inasistencias', tone: alerts.length > 0 ? 'warning' : 'neutral' },
      { key: 'open-referrals', label: 'Derivaciones abiertas', value: String(openReferrals), hint: 'Casos que derivaste y siguen en trámite', tone: 'neutral', link: '/derivaciones' },
    ];
  }

  // DBU, Vicerrectorado y Coordinador: los mismos indicadores del tablero, ya acotados por rol.
  private async managementKpis(userId: string): Promise<HomeKpi[]> {
    let report;
    try {
      report = await this.indicators.execute(userId);
    } catch {
      // Sin periodo activo no hay indicadores que mostrar.
      return [];
    }
    return [
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

  private async serviceKpis(user: User): Promise<HomeKpi[]> {
    if (!user.service) {
      return [{ key: 'no-service', label: 'Servicio asignado', value: '—', hint: 'Tu cuenta no tiene un servicio asignado', tone: 'neutral' }];
    }
    const received = await this.referrals.findMany({ service: user.service });
    const count = (status: string) => received.filter((r) => r.status === status).length;
    return [
      { key: 'to-receive', label: 'Por recibir', value: String(count('ENVIADO')), hint: 'Derivaciones enviadas a tu servicio', tone: count('ENVIADO') > 0 ? 'warning' : 'neutral', link: '/derivaciones' },
      { key: 'in-care', label: 'En atención', value: String(count('RECIBIDO') + count('EN_ATENCION')), tone: 'info', link: '/derivaciones' },
      { key: 'attended', label: 'Atendidas', value: String(count('ATENDIDO')), tone: 'success', link: '/derivaciones' },
      { key: 'closed', label: 'Cerradas', value: String(count('CERRADO')), tone: 'neutral', link: '/derivaciones' },
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

    return [
      { key: 'my-tutor', label: 'Mi tutor', value: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Sin asignar', tone: 'info' },
      { key: 'next-session', label: 'Próxima sesión', value: next ? formatDateTime(next.scheduledAt) : '—', hint: next ? next.topic : 'No tienes sesiones programadas', tone: 'success', link: '/mis-sesiones' },
      { key: 'evaluation', label: 'Evaluación de mi tutor', ...evaluation, link: status?.canRespond && !status.alreadyResponded ? '/evaluar-tutoria' : undefined },
    ];
  }
}
