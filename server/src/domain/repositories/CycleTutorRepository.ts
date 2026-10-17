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
}

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
  upsert(input: Omit<CycleTutorAssignment, 'id' | 'createdAt'>): Promise<CycleTutorAssignment>;
  remove(periodId: string, schoolId: string, cycle: number): Promise<boolean>;
  /** Estudiantes activos matriculados en ese ciclo y escuela en el periodo. */
  studentsOfCycle(periodId: string, schoolId: string, cycle: number): Promise<CycleStudent[]>;
  /** Cuántos matriculados hay por ciclo en la escuela. */
  enrolledByCycle(periodId: string, schoolId: string): Promise<Map<number, { total: number; withoutTutor: number }>>;
}
