import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { EvaluationWindowsOverview } from '@application/dtos/evaluation.dto';
import { EvaluationWindowForbiddenError, NoActivePeriodError } from './EvaluationErrors';

/**
 * Panel de configuración de la evaluación por escuela (HU-38, Art. 17.d):
 * lista todas las escuelas y si la evaluación está abierta para cada una en
 * el periodo activo. Una escuela sin fila en EvaluationWindow se reporta
 * cerrada (valor por defecto, opt-in).
 */
export class ListEvaluationWindowsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly windows: EvaluationWindowRepository,
  ) {}

  async execute(requesterId: string): Promise<EvaluationWindowsOverview> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationWindowForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || role.name !== 'Administrador DBU') {
      throw new EvaluationWindowForbiddenError();
    }

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const [allSchools, openWindows] = await Promise.all([
      this.schools.findAll(),
      this.windows.findAllByPeriod(period.id),
    ]);

    const openSchoolIds = new Set(openWindows.filter((w) => w.isOpen).map((w) => w.schoolId));

    return {
      periodName: period.name,
      schools: allSchools.map((school) => ({
        schoolId: school.id,
        schoolName: school.name,
        isOpen: openSchoolIds.has(school.id),
      })),
    };
  }
}
