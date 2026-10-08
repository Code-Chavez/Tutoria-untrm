import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  GroupSessionAttendanceError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  AttendanceLimitReachedError,
  AttendanceNumberTakenError,
  SessionAlreadyCancelledError,
  SessionOutsidePeriodError,
} from './SessionErrors';

const DEFAULT_MAX_SESSIONS = 8; // Anexo N°4: 8 filas por tutoría individual y semestre.
const MAX_SESSIONS_PARAM_KEY = 'max_sessions_per_semester';
// Intentos de numerar cuando otra confirmación simultánea se queda con el mismo número.
const NUMBERING_ATTEMPTS = 10;

/**
 * Registra la asistencia de una sesión individual (HU-22, Anexo N°4): el
 * tutor la confirma en el momento (reemplazando la firma del tutorado por
 * una confirmación digital) y el número de sesión se calcula solo, contando
 * las ya confirmadas de ese par tutor-tutorado **dentro del semestre de la
 * sesión** (A08): ocho en un semestre no impiden la primera del siguiente.
 */
export class RegisterAttendanceUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly systemParameters: SystemParameterRepository,
    private readonly periods: AcademicPeriodRepository,
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

    const period = await this.periods.findByDate(session.scheduledAt);
    if (!period) {
      throw new SessionOutsidePeriodError();
    }

    const maxSessions = await this.resolveMaxSessions();
    const scope = { tutorId, studentId: session.studentIds[0], periodId: period.id };

    // El recuento y la creación no son atómicos: la restricción única del número detecta la
    // carrera entre dos confirmaciones y aquí se recuenta y se reintenta.
    for (let attempt = 0; attempt < NUMBERING_ATTEMPTS; attempt++) {
      const alreadyRegistered = await this.sessions.countAttendanceByTutorAndStudent(
        tutorId,
        scope.studentId,
        scope.periodId,
      );
      if (alreadyRegistered >= maxSessions) {
        throw new AttendanceLimitReachedError(maxSessions);
      }
      try {
        await this.sessions.createAttendance(sessionId, alreadyRegistered + 1, new Date(), scope);
        return (await this.sessions.findById(sessionId)) as SessionWithParticipants;
      } catch (error) {
        if (!(error instanceof AttendanceNumberTakenError)) throw error;
      }
    }
    throw new AttendanceNumberTakenError();
  }

  private async resolveMaxSessions(): Promise<number> {
    const param = await this.systemParameters.findByKey(MAX_SESSIONS_PARAM_KEY);
    const parsed = param ? Number(param.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SESSIONS;
  }
}
