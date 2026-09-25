import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { RescheduleSessionInput } from '@application/dtos/session.dto';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionAlreadyCompletedError,
  ChangeReasonRequiredError,
  TutorScheduleConflictError,
} from './SessionErrors';

/**
 * Reprograma una sesión (HU-23): exige motivo y conserva la trazabilidad del
 * cambio (SessionChangeHistory), sin tocar duración, modalidad ni
 * participantes. No permite reprogramar una sesión ya realizada ni una
 * cancelada.
 */
export class RescheduleSessionUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(
    sessionId: string,
    tutorId: string,
    input: RescheduleSessionInput,
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

    const newScheduledAt = new Date(input.scheduledAt);
    const newEndsAt = new Date(newScheduledAt.getTime() + session.durationMinutes * 60_000);

    const overlapping = await this.sessions.findOverlapping(
      tutorId,
      newScheduledAt,
      newEndsAt,
      sessionId,
    );
    if (overlapping.length > 0) {
      throw new TutorScheduleConflictError();
    }

    await this.sessions.reschedule(sessionId, newScheduledAt, newEndsAt);
    await this.sessions.createChangeHistory({
      sessionId,
      changeType: 'RESCHEDULE',
      reason,
      previousScheduledAt: session.scheduledAt,
      newScheduledAt,
      changedById: tutorId,
    });

    // TODO(notificaciones): notificar al tutorado cuando exista un servicio
    // de notificaciones (correo/in-app), mismo punto de extensión de HU-13.

    return (await this.sessions.findById(sessionId)) as SessionWithParticipants;
  }
}
