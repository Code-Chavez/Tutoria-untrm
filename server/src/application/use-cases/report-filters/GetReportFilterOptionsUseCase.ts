import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { ReportFiltersForbiddenError } from './ReportFilterErrors';

export interface ReportFilterOptions {
  periods: { id: string; name: string; isActive: boolean }[];
  faculties: { id: string; name: string }[];
  schools: { id: string; name: string; facultyId: string }[];
  cycles: number[];
  tutors: { id: string; name: string }[];
}

/**
 * Opciones de los controles de filtro de los reportes (HU-47), acotadas al
 * alcance del solicitante: DBU y Vicerrectorado ven todo; el Coordinador solo
 * las escuelas que coordina y los ciclos y tutores de sus tutorados. Un único
 * origen para todos los reportes, sin exigir permisos de otros módulos.
 */
export class GetReportFilterOptionsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
  ) {}

  async execute(requesterId: string): Promise<ReportFilterOptions> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new ReportFiltersForbiddenError();
    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Vicerrectorado', 'Coordinador'].includes(role.name)) {
      throw new ReportFiltersForbiddenError();
    }

    const [periods, allSchools, faculties, allStudents] = await Promise.all([
      this.periods.findAll(),
      this.schools.findAll(),
      this.faculties.findAll(),
      this.students.findAll({ isActive: true }),
    ]);

    const schools =
      role.name === 'Coordinador'
        ? allSchools.filter((s) => s.coordinatorId === requesterId)
        : allSchools;
    const schoolIds = new Set(schools.map((s) => s.id));
    const students = allStudents.filter((s) => schoolIds.has(s.schoolId));

    const tutorIds = [...new Set(students.map((s) => s.tutorId).filter((id): id is string => !!id))];
    const tutors = (await Promise.all(tutorIds.map((id) => this.users.findById(id))))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      periods: periods.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive })),
      faculties: faculties
        .filter((f) => schools.some((s) => s.facultyId === f.id))
        .map((f) => ({ id: f.id, name: f.name })),
      schools: schools
        .map((s) => ({ id: s.id, name: s.name, facultyId: s.facultyId }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      cycles: [...new Set(students.map((s) => s.cycle))].sort((a, b) => a - b),
      tutors,
    };
  }
}
