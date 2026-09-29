import { AcademicPeriod } from '../entities/AcademicPeriod';

export interface AcademicPeriodRepository {
  /** El periodo académico actualmente habilitado (HU-38), si existe. */
  findActive(): Promise<AcademicPeriod | null>;
}
