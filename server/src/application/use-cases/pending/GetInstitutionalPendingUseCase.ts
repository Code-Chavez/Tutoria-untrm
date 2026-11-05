import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { DeclineNoticeAttempt, DeclineNoticeRepository } from '@domain/repositories/DeclineNoticeRepository';
import { DECLINE_NOTICE_ATTEMPT_MARGIN_MS } from '@application/use-cases/cycle-tutors/DeclineNoticeProcessor';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { TutoringRequestRepository } from '@domain/repositories/TutoringRequestRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

export type PendingKind =
  | 'DESIGNATION_REJECTED'
  | 'ACCEPTANCE_EMAIL_FAILED'
  | 'DESIGNATION_NO_RESPONSE'
  | 'TUTOR_INACTIVE'
  | 'CYCLE_WITHOUT_TUTOR'
  | 'CANCELLED_SESSION_NO_FOLLOWUP';

/**
 * Estado del aviso por correo a la coordinación de un rechazo (LEV-R05). Solo para quien administra o coordina: no lleva datos
 * técnicos. `status` SIN_REGISTRO = rechazo anterior a esta función: no se sabe si se avisó.
 */
export interface DeclineNoticeView {
  status: DeclineNoticeAttempt['status'] | 'SIN_REGISTRO';
  attemptId: string | null;
  kind: DeclineNoticeAttempt['kind'] | null;
  at: string | null;
  recipientName: string | null;
  /** Hay envío de correo configurado en el sistema (si no, un aviso EN_COLA espera a que se configure). */
  deliveryEnabled: boolean;
  /** Se puede reenviar ahora (solo el aviso; el rechazo no se toca). */
  canResend: boolean;
  /** El reenvío exige confirmar el intento mostrado (resultado incierto o sin registro). */
  needsConfirmation: boolean;
}

export interface PendingItem {
  kind: PendingKind;
  schoolId: string;
  schoolName: string;
  cycle: number | null;
  title: string;
  detail: string;
  /** Desde cuándo está pendiente (ISO). */
  since: string;
  /** Ruta de la aplicación donde se resuelve. */
  link: string;
  /** Solo en DESIGNATION_REJECTED: el aviso por correo a la coordinación. */
  notice?: DeclineNoticeView;
}

const FAILED_MAIL_MARK = '(correo no enviado)';

/**
 * Pendientes que nadie vería solos (docentes que rechazaron o no respondieron, correos de aceptación que no salieron, cuentas de tutor
 * desactivadas, ciclos con estudiantes sin tutor, citas canceladas de una solicitud sin continuación) para la coordinación de sus escuelas
 * y la DBU. Solo lee: no cambia ningún estado ni decide nada por nadie (no hay sanción ni reasignación automática).
 */
export class GetInstitutionalPendingUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditLogRepository,
    private readonly requests: TutoringRequestRepository,
    private readonly sessions: SessionRepository,
    private readonly students: StudentRepository,
    private readonly notices: DeclineNoticeRepository,
    private readonly declineNoticeDelivery: boolean,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string): Promise<{ items: PendingItem[] }> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind !== 'ALL' && scope.kind !== 'SCHOOLS') throw new StudentAccessDeniedError();
    const inScope = (schoolId: string) => scope.kind === 'ALL' || scope.schoolIds.includes(schoolId);

    const schools = (await this.schools.findAll()).filter((s) => inScope(s.id));
    const nameOf = new Map(schools.map((s) => [s.id, s.name]));
    const period = await this.periods.findActive();
    const now = this.now();
    const items: PendingItem[] = [];

    if (period) {
      const tutors = new Map<string, { name: string; active: boolean }>();
      const tutor = async (id: string) => {
        if (!tutors.has(id)) {
          const user = await this.users.findById(id);
          tutors.set(id, { name: user ? `${user.firstName} ${user.lastName}` : 'un docente que ya no existe', active: !!user?.isActive });
        }
        return tutors.get(id) as { name: string; active: boolean };
      };
      // Último intento de aceptación por designación: si el correo no salió, la bitácora lo dice (el estado guardado sigue «pendiente»).
      const lastAttempt = new Map<string, { details: string; at: Date }>();
      for (const log of await this.audit.findAll({ entity: 'CycleTutorAssignment' })) {
        if (log.action !== 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED') continue;
        const previous = lastAttempt.get(log.entityId);
        if (!previous || log.createdAt > previous.at) lastAttempt.set(log.entityId, { details: log.details ?? '', at: log.createdAt });
      }

      for (const school of schools) {
        const assignments = await this.cycleTutors.listBySchool(period.id, school.id);
        const rejectedIds = assignments.filter((a) => a.acceptanceStatus === 'RECHAZADA').map((a) => a.id);
        const attempts = await this.notices.latestByAssignments(rejectedIds);
        const coordinator = school.coordinatorId ? await this.users.findById(school.coordinatorId) : null;
        const hasRecipient = !!coordinator && coordinator.isActive && !!coordinator.email;
        for (const a of assignments) {
          const base = { schoolId: school.id, schoolName: school.name, cycle: a.cycle, link: '/asignacion' };
          const who = await tutor(a.tutorId);
          const place = `ciclo ${a.cycle} de ${school.name}`;
          if (a.acceptanceStatus === 'RECHAZADA') {
            items.push({
              ...base,
              kind: 'DESIGNATION_REJECTED',
              title: `${who.name} rechazó la tutoría del ${place}`,
              detail: a.declineReason ? `Motivo: ${a.declineReason}` : 'No indicó un motivo. El ciclo necesita otro docente.',
              since: (a.respondedAt ?? a.createdAt).toISOString(),
              notice: await this.noticeView(attempts.get(a.id) ?? null, hasRecipient, now),
            });
          } else if (a.acceptanceStatus === 'PENDIENTE') {
            const attempt = lastAttempt.get(a.id);
            if (attempt?.details.endsWith(FAILED_MAIL_MARK)) {
              items.push({
                ...base,
                kind: 'ACCEPTANCE_EMAIL_FAILED',
                title: `No salió el correo de aceptación a ${who.name} (${place})`,
                detail: 'El docente no recibió el enlace. Vuelve a enviarlo o avísale por otro medio.',
                since: attempt.at.toISOString(),
              });
            } else if (a.acceptanceExpiresAt && a.acceptanceExpiresAt < now) {
              items.push({
                ...base,
                kind: 'DESIGNATION_NO_RESPONSE',
                title: `${who.name} no respondió a la designación del ${place}`,
                detail: 'El enlace de aceptación venció sin respuesta. Vuelve a enviarlo o designa a otro docente.',
                since: a.acceptanceExpiresAt.toISOString(),
              });
            }
          }
          if (!who.active) {
            items.push({
              ...base,
              kind: 'TUTOR_INACTIVE',
              title: `La cuenta de ${who.name} está desactivada (${place})`,
              detail: 'Los estudiantes de este ciclo tienen como tutor a alguien que no puede entrar al sistema.',
              since: a.createdAt.toISOString(),
            });
          }
        }
        const covered = new Set(assignments.map((a) => a.cycle));
        for (const [cycle, count] of await this.cycleTutors.enrolledByCycle(period.id, school.id)) {
          if (count.withoutTutor > 0 && !covered.has(cycle)) {
            items.push({
              schoolId: school.id,
              schoolName: school.name,
              cycle,
              kind: 'CYCLE_WITHOUT_TUTOR',
              title: `Ciclo ${cycle} de ${school.name}: ${count.withoutTutor} ${count.withoutTutor === 1 ? 'estudiante sin tutor' : 'estudiantes sin tutor'}`,
              detail: 'Mientras no haya tutor, sus solicitudes llegan a la coordinación de la escuela.',
              since: period.startDate.toISOString(),
              link: '/asignacion',
            });
          }
        }
      }
    }

    // Solicitudes cuya sesión vinculada se canceló y siguen sin atenderse: la persona sigue esperando respuesta.
    for (const request of await this.requests.findAll()) {
      if (!request.sessionId || request.status === 'ATENDIDA') continue;
      const student = await this.students.findById(request.studentId);
      if (!student || !inScope(student.schoolId)) continue;
      const session = await this.sessions.findById(request.sessionId);
      if (!session?.cancelledAt) continue;
      items.push({
        schoolId: student.schoolId,
        schoolName: nameOf.get(student.schoolId) ?? '',
        cycle: student.cycle,
        kind: 'CANCELLED_SESSION_NO_FOLLOWUP',
        title: `Se canceló la cita de la solicitud de ${student.firstName} ${student.lastName}`,
        detail: `La solicitud sigue ${request.status === 'EN_ATENCION' ? 'en atención' : 'pendiente'} y no tiene otra cita. Motivo de la cancelación: ${session.cancelReason ?? 'no indicado'}.`,
        since: session.cancelledAt.toISOString(),
        link: `/solicitudes?solicitud=${request.id}`,
      });
    }

    items.sort((a, b) => a.since.localeCompare(b.since)); // lo que lleva más tiempo esperando, primero
    return { items };
  }

  private async noticeView(attempt: DeclineNoticeAttempt | null, hasRecipient: boolean, now: Date): Promise<DeclineNoticeView> {
    const deliveryEnabled = this.declineNoticeDelivery;
    if (!attempt) {
      // Rechazo anterior a esta función: no se sabe si se avisó. No se le atribuye ningún resultado.
      return { status: 'SIN_REGISTRO', attemptId: null, kind: null, at: null, recipientName: null, deliveryEnabled, canResend: deliveryEnabled && hasRecipient, needsConfirmation: true };
    }
    // Un intento en curso que superó el margen se muestra como INCIERTO aunque nadie lo haya reescrito todavía.
    const expired = attempt.status === 'ENVIANDO' && attempt.startedAt !== null && attempt.startedAt.getTime() < now.getTime() - DECLINE_NOTICE_ATTEMPT_MARGIN_MS;
    const status = expired ? 'INCIERTO' : attempt.status;
    const recipient = attempt.recipientUserId ? await this.users.findById(attempt.recipientUserId) : null;
    const resendable = status === 'FALLIDO' || status === 'INCIERTO' || status === 'DATOS_INCOMPLETOS' || status === 'OBSOLETO' || status === 'SIN_DESTINATARIO';
    return {
      status,
      attemptId: attempt.id,
      kind: attempt.kind,
      at: (attempt.finishedAt ?? attempt.startedAt ?? attempt.createdAt).toISOString(),
      recipientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : null,
      deliveryEnabled,
      canResend: deliveryEnabled && resendable && hasRecipient,
      needsConfirmation: status === 'INCIERTO',
    };
  }
}
