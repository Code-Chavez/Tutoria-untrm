export type AcceptanceStatus = 'SIN_SOLICITAR' | 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

/** Un tramo semanal de atención que fija el docente. */
export interface AvailabilitySlot {
  /** 1 = lunes … 6 = sábado. */
  day: number;
  start: string;
  end: string;
  place?: string;
}

export interface CycleTutorAssignment {
  id: string;
  periodId: string;
  schoolId: string;
  cycle: number;
  tutorId: string;
  isException: boolean;
  note?: string | null;
  assignedById: string;
  createdAt: Date;
  acceptanceStatus: AcceptanceStatus;
  acceptanceExpiresAt?: Date | null;
  requestedAt?: Date | null;
  respondedAt?: Date | null;
  declineReason?: string | null;
  availability?: AvailabilitySlot[] | null;
}

export type NewCycleTutorAssignment = Pick<CycleTutorAssignment, 'periodId' | 'schoolId' | 'cycle' | 'tutorId' | 'isException' | 'note' | 'assignedById'>;

/** Estudiante matriculado en un ciclo, con su tutor actual. */
export interface CycleStudent {
  studentId: string;
  tutorId: string | null;
}

/** Tutor de cada ciclo de una escuela en un periodo. */
export interface CycleTutorRepository {
  listBySchool(periodId: string, schoolId: string): Promise<CycleTutorAssignment[]>;
  find(periodId: string, schoolId: string, cycle: number): Promise<CycleTutorAssignment | null>;
  /** Ciclos (de cualquier escuela) que atiende un tutor en el periodo. */
  listByTutor(periodId: string, tutorId: string): Promise<CycleTutorAssignment[]>;
  /** Fija el tutor del ciclo (reemplaza al anterior). */
  /** Fija el tutor del ciclo; si cambia el tutor, la aceptación vuelve a empezar. */
  upsert(input: NewCycleTutorAssignment): Promise<CycleTutorAssignment>;
  /** Guarda la huella del enlace de aceptación y deja la solicitud pendiente (invalida el enlace anterior). */
  requestAcceptance(id: string, tokenHash: string, expiresAt: Date, requestedAt: Date): Promise<void>;
  findByAcceptanceToken(tokenHash: string): Promise<CycleTutorAssignment | null>;
  /** Registra la respuesta del docente y consume el enlace. */
  recordResponse(id: string, response: { accepted: boolean; availability?: AvailabilitySlot[]; declineReason?: string }, respondedAt: Date): Promise<void>;
  remove(periodId: string, schoolId: string, cycle: number): Promise<boolean>;
  /** Estudiantes activos matriculados en ese ciclo y escuela en el periodo. */
  studentsOfCycle(periodId: string, schoolId: string, cycle: number): Promise<CycleStudent[]>;
  /** Cuántos matriculados hay por ciclo en la escuela. */
  enrolledByCycle(periodId: string, schoolId: string): Promise<Map<number, { total: number; withoutTutor: number }>>;
}
