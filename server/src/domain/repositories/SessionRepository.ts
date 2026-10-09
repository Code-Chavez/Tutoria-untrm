import {
  Session,
  SessionAttendance,
  SessionChangeHistory,
  SessionEvidence,
  SessionWithParticipants,
} from '../entities/Session';

export interface SessionFilters {
  tutorId?: string;
  studentId?: string;
}

/** Ámbito de la numeración de la asistencia: tutor, tutorado y semestre. */
export interface AttendanceScope {
  tutorId: string;
  studentId: string;
  periodId: string;
}

export interface SessionRepository {
  /** Crea la sesión y sus filas de participantes en una sola operación. */
  create(
    data: Omit<Session, 'id' | 'createdAt'>,
    studentIds: string[],
  ): Promise<SessionWithParticipants>;
  findById(id: string): Promise<SessionWithParticipants | null>;
  /**
   * Sesiones (no canceladas) de un tutor que se solapan con [start, end).
   * excludeSessionId permite comparar contra las demás al reprogramar una.
   */
  findOverlapping(
    tutorId: string,
    start: Date,
    end: Date,
    excludeSessionId?: string,
  ): Promise<Session[]>;
  findAll(filters?: SessionFilters): Promise<SessionWithParticipants[]>;
  /** Sesiones de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<SessionWithParticipants[]>;
  /**
   * Cuántas sesiones individuales de ese tutor con ese tutorado ya tienen asistencia
   * registrada **dentro del semestre** (HU-22, A08): define el próximo número del Anexo N°4.
   */
  countAttendanceByTutorAndStudent(tutorId: string, studentId: string, periodId: string): Promise<number>;
  /**
   * Registra la asistencia con su número dentro del semestre. Lanza AttendanceNumberTakenError
   * si otra confirmación simultánea ya tomó ese número (el llamador recuenta y reintenta) y
   * AttendanceAlreadyRegisteredError si la sesión ya tenía asistencia.
   */
  createAttendance(
    sessionId: string,
    sequenceNumber: number,
    confirmedAt: Date,
    scope: AttendanceScope,
  ): Promise<SessionAttendance>;
  /**
   * Registra quién asistió y quién no entre los participantes de la sesión (A07).
   * Reemplaza un registro anterior del mismo tutor (corrección).
   */
  recordParticipantAttendance(
    sessionId: string,
    attendedStudentIds: string[],
    absentStudentIds: string[],
  ): Promise<void>;

  /** Cambia el horario de la sesión (HU-23); no toca participantes ni modalidad. */
  reschedule(id: string, scheduledAt: Date, endsAt: Date): Promise<SessionWithParticipants>;
  /** Marca la sesión como cancelada (HU-23), sin borrarla. */
  cancel(id: string, cancelledAt: Date, reason: string): Promise<SessionWithParticipants>;
  createChangeHistory(
    data: Omit<SessionChangeHistory, 'id' | 'createdAt'>,
  ): Promise<SessionChangeHistory>;

  /** Repositorio de evidencias (HU-25): PDF o imagen que respalda la sesión. */
  createEvidence(data: Omit<SessionEvidence, 'id' | 'createdAt'>): Promise<SessionEvidence>;
  listEvidenceBySession(sessionId: string): Promise<SessionEvidence[]>;
  findEvidenceById(id: string): Promise<SessionEvidence | null>;
}
