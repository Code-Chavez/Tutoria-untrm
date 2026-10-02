import { WorkPlan, WorkPlanContent, WorkPlanResolutionFile } from '../entities/WorkPlan';

export interface WorkPlanRepository {
  findByPeriodAndSchool(periodId: string, schoolId: string): Promise<WorkPlan | null>;
  findAllByPeriod(periodId: string): Promise<WorkPlan[]>;
  /** Crea o reemplaza el plan de la escuela en el periodo. */
  upsert(
    periodId: string,
    schoolId: string,
    authorId: string,
    content: WorkPlanContent,
  ): Promise<WorkPlan>;
  /** Registra (o reemplaza) el PDF de la resolución de aprobación del plan. */
  setResolution(planId: string, file: WorkPlanResolutionFile): Promise<WorkPlan>;
}
