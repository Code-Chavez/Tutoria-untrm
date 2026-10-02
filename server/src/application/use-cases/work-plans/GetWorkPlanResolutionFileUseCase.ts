import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';
import {
  WorkPlanForbiddenError,
  WorkPlanNotFoundError,
  WorkPlanResolutionNotFoundError,
} from './WorkPlanErrors';

/** Ruta en disco del PDF de la resolución para descargarlo (HU-42). */
export class GetWorkPlanResolutionFileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(
    requesterId: string,
    schoolId: string,
  ): Promise<{ fileName: string; absolutePath: string }> {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);
    if (!manageable.some((s) => s.id === schoolId)) throw new WorkPlanForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const plan = await this.workPlans.findByPeriodAndSchool(period.id, schoolId);
    if (!plan) throw new WorkPlanNotFoundError();
    if (!plan.resolutionStorageKey || !plan.resolutionFileName) {
      throw new WorkPlanResolutionNotFoundError();
    }
    return {
      fileName: plan.resolutionFileName,
      absolutePath: this.storage.resolvePath(plan.resolutionStorageKey),
    };
  }
}
