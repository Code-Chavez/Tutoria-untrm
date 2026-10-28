import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { DeclineNoticeAttempt, DeclineNoticeRepository, NoticeOperationTakenError, ResendReason } from '@domain/repositories/DeclineNoticeRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { NoPeriodForCycleTutorsError } from './CycleTutorUseCases';
import { CycleTutorNotFoundError } from './TutorAcceptanceUseCases';
import { DECLINE_NOTICE_ATTEMPT_MARGIN_MS, DeclineNoticeProcessor } from './DeclineNoticeProcessor';

/** Datos mínimos del intento anterior que se muestran al pedir confirmación (no se revela nada más). */
export interface PreviousAttemptSummary {
  attemptId: string | null;
  status: DeclineNoticeAttempt['status'] | null;
  at: Date | null;
}

const summarize = (a: DeclineNoticeAttempt | null): PreviousAttemptSummary => ({ attemptId: a?.id ?? null, status: a?.status ?? null, at: a ? (a.finishedAt ?? a.startedAt ?? a.createdAt) : null });

/** La designación ya no está rechazada (o cambió de docente): un reenvío de ese aviso sería obsoleto. */
export class DeclineNoticeNotRejectedError extends Error {
  constructor() {
    super('La designación ya no está rechazada: no hay un aviso que reenviar.');
    this.name = 'DeclineNoticeNotRejectedError';
  }
}
/** Hay un intento en curso (o en cola): no se puede saltar con una confirmación; hay que esperar su resultado. */
export class DeclineNoticeInFlightError extends Error {
  constructor(readonly previous: PreviousAttemptSummary) {
    super('El aviso se está enviando en este momento. Espere su resultado antes de reenviarlo.');
    this.name = 'DeclineNoticeInFlightError';
  }
}
/** El servidor de correo ya aceptó el aviso: no hay nada que reenviar. */
export class DeclineNoticeAlreadySentError extends Error {
  constructor(readonly previous: PreviousAttemptSummary) {
    super('El servidor de correo ya aceptó este aviso: no hay nada que reenviar.');
    this.name = 'DeclineNoticeAlreadySentError';
  }
}
/** El resultado anterior es incierto (o no hay registro): hay que confirmar ESE intento para reenviar. */
export class DeclineNoticeConfirmationRequiredError extends Error {
  constructor(readonly previous: PreviousAttemptSummary) {
    super('No se puede saber si el aviso anterior salió. Si quiere reenviarlo, confirme expresamente ese intento.');
    this.name = 'DeclineNoticeConfirmationRequiredError';
  }
}
export class NoEnabledRecipientError extends Error {
  constructor() {
    super('No se realizó el envío porque no hay un destinatario habilitado.');
    this.name = 'NoEnabledRecipientError';
  }
}
export class DeclineNoticeDeliveryDisabledError extends Error {
  constructor() {
    super('El envío de correos no está configurado en el sistema. El aviso queda en espera y saldrá cuando se configure el correo (SMTP); pida a la administración que lo configure.');
    this.name = 'DeclineNoticeDeliveryDisabledError';
  }
}
/** El identificador de operación ya se usó con otra designación: se rechaza sin revelar nada. */
export class NoticeOperationConflictError extends Error {
  constructor() {
    super('El identificador de la operación ya se usó con otros datos. Vuelva a intentarlo desde Pendientes.');
    this.name = 'NoticeOperationConflictError';
  }
}

export interface ResendInput {
  /** Identifica la intención de la persona: repetirla (p. ej. por perder la respuesta) no envía otro correo. */
  operationId: string;
  /** Intento anterior que la persona vio y confirma reenviar (`attemptId: null` = el aviso sin registro de rechazos anteriores). */
  confirmPrevious?: { attemptId: string | null };
}

export interface ResendResult {
  attempt: DeclineNoticeAttempt;
  recipientName: string | null;
  replayed: boolean;
}

/**
 * Reenvía SOLO el aviso a la coordinación (LEV-R05): no repite ni modifica el rechazo del docente (estado, motivo, fecha). Cada
 * reenvío es un intento nuevo con identidad de operación: repetir la misma operación (p. ej. tras perder la respuesta HTTP) devuelve
 * lo guardado y no envía otra vez, aunque el primer intento haya quedado INCIERTO. Un intento INCIERTO solo se reenvía confirmando
 * ese intento concreto; una confirmación de otro intento no sirve. Un intento en curso bloquea sin remedio. El destinatario es el
 * habilitado AHORA (la coordinación vigente) y queda anotado en el intento.
 */
export class ResendDeclineNoticeUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly cycleTutors: CycleTutorRepository,
    private readonly notices: DeclineNoticeRepository,
    private readonly processor: DeclineNoticeProcessor,
    private readonly audit: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, schoolId: string, cycle: number, input: ResendInput, ip?: string | null): Promise<ResendResult> {
    // 1. Permisos y alcance antes de mirar el identificador de operación o cualquier dato del aviso.
    await this.guard.assertSchoolAccess(requesterId, schoolId);
    const school = await this.schools.findById(schoolId);
    if (!school) throw new StudentAccessDeniedError();
    const period = await this.periods.findActive();
    if (!period) throw new NoPeriodForCycleTutorsError();
    const assignment = await this.cycleTutors.find(period.id, schoolId, cycle);
    if (!assignment) throw new CycleTutorNotFoundError();
    if (!this.processor.enabled) throw new DeclineNoticeDeliveryDisabledError();

    // 2. Destinatario habilitado actual (si no hay, no se crea ningún intento).
    const coordinator = school.coordinatorId ? await this.users.findById(school.coordinatorId) : null;
    if (!coordinator || !coordinator.isActive || !coordinator.email) throw new NoEnabledRecipientError();

    // 3. Reserva en una transacción corta con candado por designación (nunca durante el envío).
    let reserved: { attempt: DeclineNoticeAttempt; replayed: boolean } | undefined;
    for (let pass = 0; pass < 2 && !reserved; pass += 1) {
      try {
        reserved = await this.notices.reserve(assignment.id, async (tx) => {
          const now = this.now();
          await tx.expireStale(assignment.id, new Date(now.getTime() - DECLINE_NOTICE_ATTEMPT_MARGIN_MS));
          const state = await tx.state(assignment.id);
          if (!state || state.acceptanceStatus !== 'RECHAZADA' || !state.respondedAt) throw new DeclineNoticeNotRejectedError();

          // Idempotencia: la misma persona y el mismo identificador. La búsqueda es solo del solicitante.
          const existing = await tx.findByOperation(requesterId, input.operationId);
          if (existing) {
            if (existing.assignmentId !== assignment.id) throw new NoticeOperationConflictError();
            return { attempt: existing, replayed: true };
          }

          const latest = state.latest;
          const confirmed = input.confirmPrevious !== undefined && input.confirmPrevious.attemptId === (latest?.id ?? null);
          let reason: ResendReason;
          if (!latest) {
            if (!confirmed) throw new DeclineNoticeConfirmationRequiredError(summarize(null));
            reason = 'SIN_REGISTRO_PREVIO';
          } else if (latest.status === 'EN_COLA' || latest.status === 'ENVIANDO') {
            throw new DeclineNoticeInFlightError(summarize(latest));
          } else if (latest.status === 'ENVIADO') {
            throw new DeclineNoticeAlreadySentError(summarize(latest));
          } else if (latest.status === 'INCIERTO') {
            if (!confirmed) throw new DeclineNoticeConfirmationRequiredError(summarize(latest));
            reason = 'CONFIRMADO_TRAS_INCIERTO';
          } else if (latest.status === 'FALLIDO') {
            reason = 'REINTENTO_TRAS_FALLO';
          } else {
            reason = 'REINTENTO_SIN_ENVIO';
          }
          const attempt = await tx.insertResend({
            assignmentId: assignment.id,
            tutorId: state.tutorId,
            declinedAt: state.respondedAt,
            operationId: input.operationId,
            requestedById: requesterId,
            reason,
            previousAttemptId: latest?.id ?? null,
          });
          return { attempt, replayed: false };
        });
      } catch (error) {
        // Carrera entre dos peticiones con el mismo identificador: la segunda se resuelve como repetición.
        if (error instanceof NoticeOperationTakenError && pass === 0) continue;
        if (error instanceof NoticeOperationTakenError) throw new NoticeOperationConflictError();
        throw error;
      }
    }
    if (!reserved) throw new NoticeOperationConflictError();
    if (reserved.replayed) return { attempt: reserved.attempt, recipientName: await this.recipientName(reserved.attempt), replayed: true };

    await this.audit.create({
      userId: requesterId,
      action: 'CYCLE_TUTOR_DECLINE_NOTICE_RESEND',
      entity: 'CycleTutorAssignment',
      entityId: assignment.id,
      details: `intento ${reserved.attempt.id} (reenvío): ${reserved.attempt.reason}`,
      ipAddress: ip ?? null,
    });

    // 4. Entrega por la misma reserva atómica que usa el proceso de fondo: lo envía uno solo. Fuera de toda transacción.
    const resolved = (await this.processor.attemptNow(reserved.attempt.id)) ?? (await this.notices.findById(reserved.attempt.id)) ?? reserved.attempt;
    return { attempt: resolved, recipientName: await this.recipientName(resolved), replayed: false };
  }

  private async recipientName(attempt: DeclineNoticeAttempt): Promise<string | null> {
    if (!attempt.recipientUserId) return null;
    const user = await this.users.findById(attempt.recipientUserId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  }
}
