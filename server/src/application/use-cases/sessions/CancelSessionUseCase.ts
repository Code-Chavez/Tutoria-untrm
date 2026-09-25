import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { CancelSessionInput } from '@application/dtos/session.dto';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionAlreadyCompletedError,
  ChangeReasonRequiredError,
} from './SessionErrors';

/**
 * Cancela una sesión (HU-23): exige motivo y conserva la trazabilidad del
 * cambio (SessionChangeHistory). La sesión no se borra, solo se marca
 * cancelada; no se permite cancelar una que ya se realizó.
 */
export class CancelSessionUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(
    sessionId: string,
    tutorId: string,
    input: CancelSessionInput,
  ): Promise<SessionWithParticipants> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    if (session.tutorId !== tutorId) {
      throw new NotSessionTutorError();
    }
    if (session.cancelledAt) {
      throw new SessionAlreadyCancelledError();
    }
    if (new Date() > session.endsAt) {
      throw new SessionAlreadyCompletedError();
    }

    const reason = input.reason.trim();
    if (!reason) {
      throw new ChangeReasonRequiredError();
    }

    const cancelledAt = new Date();
    await this.sessions.cancel(sessionId, cancelledAt, reason);
    await this.sessions.createChangeHistory({
      sessionId,
      changeType: 'CANCEL',
      reason,
      previousScheduledAt: null,
      newScheduledAt: null,
      changedById: tutorId,
    });

    // TODO(notificaciones): notificar al tutorado cuando exista un servicio
    // de notificaciones (correo/in-app), mismo punto de extensión de HU-13.

    return (await this.sessions.findById(sessionId)) as SessionWithParticipants;
  }
}
