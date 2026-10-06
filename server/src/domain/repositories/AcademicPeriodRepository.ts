import { AcademicPeriod } from '../entities/AcademicPeriod';

export interface AcademicPeriodRepository {
  /** El periodo académico actualmente habilitado (HU-38), si existe. */
  findActive(): Promise<AcademicPeriod | null>;
  /** Todos los semestres, el más reciente primero (filtro de reportes, HU-47). */
  findAll(): Promise<AcademicPeriod[]>;
  findById(id: string): Promise<AcademicPeriod | null>;
}
