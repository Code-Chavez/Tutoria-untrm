import { Student } from '../entities/Student';

/** Corte de la matrícula por semestre (A17). */
export interface PeriodRosterRepository {
  /**
   * Los tutorados del semestre tal como estaban al cerrarse (escuela, ciclo, tutor y
   * estado congelados), o null si el semestre no tiene corte (el vigente o uno anterior al corte).
   */
  findByPeriod(periodId: string): Promise<Student[] | null>;
}
