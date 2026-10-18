import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { CancelSessionInput } from '@application/dtos/session.dto';
import { SessionNotice, SessionNotifier } from '@application/services/SessionNotifier';
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
  constructor(
    private readonly sessions: SessionRepository,
    // Avisa a los tutorados de la cancelación y de su motivo.
    private readonly notifier?: SessionNotifier,
  ) {}

  async execute(
    sessionId: string,
    tutorId: string,
    input: CancelSessionInput,
  ): Promise<SessionWithParticipants & { notice?: SessionNotice }> {
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

    const updated = (await this.sessions.findById(sessionId)) as SessionWithParticipants;
    if (!this.notifier) return updated;
    const notice = await this.notifier.notify(updated, { kind: 'cancelled', reason });
    return Object.assign(updated, { notice });
  }
}
