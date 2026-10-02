import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';

export interface WorkPlansOverview {
  periodName: string;
  schools: { schoolId: string; schoolName: string; hasPlan: boolean; inForce: boolean }[];
}

/** Escuelas que el solicitante puede gestionar y si ya tienen plan en el periodo activo (HU-41). */
export class ListWorkPlansUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
  ) {}

  async execute(requesterId: string): Promise<WorkPlansOverview> {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const plans = await this.workPlans.findAllByPeriod(period.id);
    const bySchool = new Map(plans.map((p) => [p.schoolId, p]));

    return {
      periodName: period.name,
      schools: manageable.map((s) => ({
        schoolId: s.id,
        schoolName: s.name,
        hasPlan: bySchool.has(s.id),
        inForce: !!bySchool.get(s.id)?.resolutionStorageKey,
      })),
    };
  }
}
