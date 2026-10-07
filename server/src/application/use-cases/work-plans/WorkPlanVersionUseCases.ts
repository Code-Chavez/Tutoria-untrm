import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { resolveManageableSchools } from './resolveManageableSchools';
import { WorkPlanView } from './GetWorkPlanUseCase';
import { toPublicWorkPlan } from './toPublicWorkPlan';
import { WorkPlanForbiddenError, WorkPlanNotFoundError, WorkPlanVersionNotFoundError } from './WorkPlanErrors';

export interface WorkPlanVersionSummary {
  revision: number;
  approvedAt: Date;
  resolution: { fileName: string; fileSize: number };
}


/** Resuelve el plan y la versión pedida dentro del alcance del solicitante (DBU: todas; coordinador: sus escuelas). */
class VersionLookup {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
  ) {}

  async plan(requesterId: string, schoolId: string) {
    const manageable = await resolveManageableSchools(this.users, this.roles, this.schools, requesterId);
    const school = manageable.find((s) => s.id === schoolId);
    if (!school) throw new WorkPlanForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();
    const plan = await this.workPlans.findByPeriodAndSchool(period.id, schoolId);
    if (!plan) throw new WorkPlanNotFoundError();
    return { plan, school, period };
  }

  async version(requesterId: string, schoolId: string, revision: number) {
    const { plan, school, period } = await this.plan(requesterId, schoolId);
    const version = await this.workPlans.findVersion(plan.id, revision);
    if (!version) throw new WorkPlanVersionNotFoundError();
    return { plan, version, school, period };
  }
}

/** Versiones aprobadas archivadas del plan de una escuela (A12). */
export class ListWorkPlanVersionsUseCase {
  private readonly lookup: VersionLookup;

  constructor(
    users: UserRepository,
    roles: RoleRepository,
    schools: SchoolRepository,
    periods: AcademicPeriodRepository,
    private readonly workPlans: WorkPlanRepository,
  ) {
    this.lookup = new VersionLookup(users, roles, schools, periods, workPlans);
  }

  async execute(requesterId: string, schoolId: string): Promise<WorkPlanVersionSummary[]> {
    const { plan } = await this.lookup.plan(requesterId, schoolId);
    const versions = await this.workPlans.findVersions(plan.id);
    return versions.map((v) => ({
      revision: v.revision,
      approvedAt: v.resolutionUploadedAt,
      resolution: { fileName: v.resolutionFileName, fileSize: v.resolutionFileSize },
    }));
  }
}

/** Contenido de una versión aprobada, para exportarla en PDF tal como se aprobó. */
export class GetWorkPlanVersionUseCase {
  private readonly lookup: VersionLookup;

  constructor(
    users: UserRepository,
    roles: RoleRepository,
    schools: SchoolRepository,
    periods: AcademicPeriodRepository,
    workPlans: WorkPlanRepository,
  ) {
    this.lookup = new VersionLookup(users, roles, schools, periods, workPlans);
  }

  async execute(requesterId: string, schoolId: string, revision: number): Promise<WorkPlanView> {
    const { plan, version, school, period } = await this.lookup.version(requesterId, schoolId, revision);
    const approved = toPublicWorkPlan({
      ...plan,
      ...version.content,
      authorId: version.authorId,
      revision: version.revision,
      lastApprovedRevision: version.revision,
      resolutionFileName: version.resolutionFileName,
      resolutionFileSize: version.resolutionFileSize,
      resolutionStorageKey: version.resolutionStorageKey,
      resolutionUploadedAt: version.resolutionUploadedAt,
      updatedAt: version.resolutionUploadedAt,
    });
    return { periodName: period.name, schoolName: school.name, plan: approved };
  }
}

/** Resolución en PDF de una versión aprobada archivada. */
export class GetWorkPlanVersionResolutionFileUseCase {
  private readonly lookup: VersionLookup;

  constructor(
    users: UserRepository,
    roles: RoleRepository,
    schools: SchoolRepository,
    periods: AcademicPeriodRepository,
    workPlans: WorkPlanRepository,
    private readonly storage: EvidenceStorage,
  ) {
    this.lookup = new VersionLookup(users, roles, schools, periods, workPlans);
  }

  async execute(requesterId: string, schoolId: string, revision: number): Promise<{ fileName: string; absolutePath: string }> {
    const { version } = await this.lookup.version(requesterId, schoolId, revision);
    return { fileName: version.resolutionFileName, absolutePath: this.storage.resolvePath(version.resolutionStorageKey) };
  }
}
