import { Session, SessionWithParticipants } from '../entities/Session';

export interface SessionFilters {
  tutorId?: string;
  studentId?: string;
}

export interface SessionRepository {
  /** Crea la sesión y sus filas de participantes en una sola operación. */
  create(
    data: Omit<Session, 'id' | 'createdAt'>,
    studentIds: string[],
  ): Promise<SessionWithParticipants>;
  /** Sesiones de un tutor que se solapan con el rango [start, end). */
  findOverlapping(tutorId: string, start: Date, end: Date): Promise<Session[]>;
  findAll(filters?: SessionFilters): Promise<SessionWithParticipants[]>;
  /** Sesiones de un estudiante, más reciente primero (para el expediente). */
  findByStudent(studentId: string): Promise<SessionWithParticipants[]>;
}
