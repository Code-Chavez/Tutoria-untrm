import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { WorkPlan } from '@domain/entities/WorkPlan';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';
import { WorkPlanForbiddenError } from './WorkPlanErrors';

export interface WorkPlanView {
  periodName: string;
  schoolName: string;
  plan: WorkPlan | null;
}

/** Plan de trabajo de una escuela en el periodo activo, o null si aún no se elaboró (HU-41). */
export class GetWorkPlanUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
  ) {}

  async execute(requesterId: string, schoolId: string): Promise<WorkPlanView> {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);
    const school = manageable.find((s) => s.id === schoolId);
    if (!school) throw new WorkPlanForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const plan = await this.workPlans.findByPeriodAndSchool(period.id, schoolId);
    return { periodName: period.name, schoolName: school.name, plan };
  }
}
