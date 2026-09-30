import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { EvaluationWindowSchoolState } from '@application/dtos/evaluation.dto';
import {
  EvaluationWindowForbiddenError,
  NoActivePeriodError,
  SchoolNotFoundError,
} from './EvaluationErrors';

/**
 * Abre o cierra la evaluación de tutoría para una escuela en el periodo
 * activo (HU-38, Art. 17.d). Solo el Administrador DBU la administra.
 */
export class SetEvaluationWindowUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly windows: EvaluationWindowRepository,
  ) {}

  async execute(
    requesterId: string,
    schoolId: string,
    isOpen: boolean,
  ): Promise<EvaluationWindowSchoolState> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationWindowForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || role.name !== 'Administrador DBU') {
      throw new EvaluationWindowForbiddenError();
    }

    const school = await this.schools.findById(schoolId);
    if (!school) throw new SchoolNotFoundError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const window = await this.windows.upsert(period.id, schoolId, isOpen);

    return { schoolId: school.id, schoolName: school.name, isOpen: window.isOpen };
  }
}
