import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';
import { WorkPlanForbiddenError, WorkPlanNotFoundError } from './WorkPlanErrors';
import { PublicWorkPlan, toPublicWorkPlan } from './toPublicWorkPlan';

export interface UploadResolutionInput {
  fileBuffer: Buffer;
  fileName: string;
  fileSize: number;
}

/**
 * Adjunta el PDF de la resolución que aprueba el plan (HU-42, Art. 17.a);
 * recién entonces el plan es vigente. Volver a subirlo reemplaza el anterior.
 */
export class UploadWorkPlanResolutionUseCase {
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
    file: UploadResolutionInput,
  ): Promise<PublicWorkPlan> {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);
    if (!manageable.some((s) => s.id === schoolId)) throw new WorkPlanForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const plan = await this.workPlans.findByPeriodAndSchool(period.id, schoolId);
    if (!plan) throw new WorkPlanNotFoundError();

    const storageKey = await this.storage.save(file.fileBuffer, file.fileName);
    const updated = await this.workPlans.setResolution(plan.id, {
      fileName: file.fileName,
      fileSize: file.fileSize,
      storageKey,
    });
    return toPublicWorkPlan(updated);
  }
}
