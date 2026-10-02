import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { WorkPlan, WorkPlanContent } from '@domain/entities/WorkPlan';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';
import { WorkPlanForbiddenError } from './WorkPlanErrors';

/**
 * Elabora o actualiza el plan de trabajo semestral de una escuela en el
 * periodo activo (HU-41, Art. 17.a). Solo el coordinador de esa escuela o la
 * DBU. La aprobación por resolución y su adjunto son HU-42.
 */
export class SaveWorkPlanUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
  ) {}

  async execute(requesterId: string, schoolId: string, content: WorkPlanContent): Promise<WorkPlan> {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);
    if (!manageable.some((s) => s.id === schoolId)) throw new WorkPlanForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    return this.workPlans.upsert(period.id, schoolId, requesterId, content);
  }
}
