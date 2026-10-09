import { WorkPlan, WorkPlanContent, WorkPlanResolutionFile, WorkPlanVersion } from '../entities/WorkPlan';

export interface WorkPlanRepository {
  findByPeriodAndSchool(periodId: string, schoolId: string): Promise<WorkPlan | null>;
  findAllByPeriod(periodId: string): Promise<WorkPlan[]>;
  /**
   * Guarda el contenido del plan de la escuela en el periodo, de forma atómica.
   * Si el plan aún no está aprobado (sin resolución) lo crea o lo actualiza. Si ya
   * tiene resolución, **archiva la versión aprobada** (contenido + resolución),
   * abre la revisión siguiente con el contenido nuevo y la deja sin resolución: la
   * aprobación nunca queda asociada a un contenido distinto del que aprobó (A12).
   */
  saveContent(
    periodId: string,
    schoolId: string,
    authorId: string,
    content: WorkPlanContent,
  ): Promise<WorkPlan>;
  /** Registra (o reemplaza) el PDF de la resolución de aprobación del plan. */
  setResolution(planId: string, file: WorkPlanResolutionFile): Promise<WorkPlan>;
  /** Versiones aprobadas archivadas del plan, la más reciente primero. */
  findVersions(planId: string): Promise<WorkPlanVersion[]>;
  findVersion(planId: string, revision: number): Promise<WorkPlanVersion | null>;
}
