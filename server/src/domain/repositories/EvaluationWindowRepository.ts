import { EvaluationWindow } from '../entities/EvaluationWindow';

export interface EvaluationWindowRepository {
  findByPeriodAndSchool(periodId: string, schoolId: string): Promise<EvaluationWindow | null>;
  findAllByPeriod(periodId: string): Promise<EvaluationWindow[]>;
  /** Crea o actualiza el estado de apertura de una escuela para un periodo. */
  upsert(periodId: string, schoolId: string, isOpen: boolean): Promise<EvaluationWindow>;
}
