import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  InvalidAttendeesError,
  IndividualAttendanceViaConfirmationError,
} from './SessionErrors';

/**
 * Registra quién asistió a una sesión (A07). Sirve para las sesiones grupales,
 * que no tenían ningún registro de asistencia, y para marcar la inasistencia de
 * una sesión individual. Quienes no se listan constan como «no asistió». El
 * tutor puede corregir el registro mientras la sesión no esté cancelada.
 */
export class RecordSessionAttendanceUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(
    sessionId: string,
    tutorId: string,
    attendedStudentIds: string[],
  ): Promise<SessionWithParticipants> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    if (session.tutorId !== tutorId) throw new NotSessionTutorError();
    if (session.cancelledAt) throw new SessionAlreadyCancelledError();
    if (new Date() < session.scheduledAt) throw new SessionNotStartedError();

    const attended = [...new Set(attendedStudentIds)];
    if (attended.some((id) => !session.studentIds.includes(id))) throw new InvalidAttendeesError();

    if (session.studentIds.length === 1) {
      if (attended.length > 0) throw new IndividualAttendanceViaConfirmationError();
      if (session.attendance) throw new AttendanceAlreadyRegisteredError();
    }

    const absent = session.studentIds.filter((id) => !attended.includes(id));
    await this.sessions.recordParticipantAttendance(sessionId, attended, absent);
    return (await this.sessions.findById(sessionId)) as SessionWithParticipants;
  }
}
