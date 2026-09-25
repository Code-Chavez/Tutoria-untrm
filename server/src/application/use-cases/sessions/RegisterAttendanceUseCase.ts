import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  GroupSessionAttendanceError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  AttendanceLimitReachedError,
  SessionAlreadyCancelledError,
} from './SessionErrors';

const DEFAULT_MAX_SESSIONS = 8; // Anexo N°4: 8 filas por tutoría individual.
const MAX_SESSIONS_PARAM_KEY = 'max_sessions_per_semester';

/**
 * Registra la asistencia de una sesión individual (HU-22, Anexo N°4): el
 * tutor la confirma en el momento (reemplazando la firma del tutorado por
 * una confirmación digital) y el número de sesión (1-8) se calcula solo,
 * contando cuántas ya lleva confirmadas ese mismo par tutor-tutorado.
 */
export class RegisterAttendanceUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly systemParameters: SystemParameterRepository,
  ) {}

  async execute(sessionId: string, tutorId: string): Promise<SessionWithParticipants> {
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
    if (session.studentIds.length !== 1) {
      throw new GroupSessionAttendanceError();
    }
    if (new Date() < session.scheduledAt) {
      throw new SessionNotStartedError();
    }
    if (session.attendance) {
      throw new AttendanceAlreadyRegisteredError();
    }

    const maxSessions = await this.resolveMaxSessions();
    const alreadyRegistered = await this.sessions.countAttendanceByTutorAndStudent(
      tutorId,
      session.studentIds[0],
    );
    if (alreadyRegistered >= maxSessions) {
      throw new AttendanceLimitReachedError(maxSessions);
    }

    await this.sessions.createAttendance(sessionId, alreadyRegistered + 1, new Date());
    return (await this.sessions.findById(sessionId)) as SessionWithParticipants;
  }

  private async resolveMaxSessions(): Promise<number> {
    const param = await this.systemParameters.findByKey(MAX_SESSIONS_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SESSIONS;
  }
}
