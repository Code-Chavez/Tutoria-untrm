import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { buildConsolidatedReport, ConsolidatedReport } from './buildConsolidatedReport';
import { ConsolidatedReportForbiddenError } from './ConsolidatedReportErrors';

export interface ConsolidatedReportFilters {
  facultyId?: string;
  schoolId?: string;
}

const ALLOWED_ROLES = ['Administrador DBU', 'Vicerrectorado'];

/**
 * Informe consolidado por escuela y facultad del periodo activo (HU-44) con
 * totales y promedios, para la DBU y las autoridades académicas.
 */
export class GetConsolidatedReportUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly sessions: SessionRepository,
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly reports: TutorSemesterReportRepository,
  ) {}

  async execute(
    requesterId: string,
    filters: ConsolidatedReportFilters = {},
  ): Promise<ConsolidatedReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new ConsolidatedReportForbiddenError();
    const role = await this.roles.findById(requester.roleId);
    if (!role || !ALLOWED_ROLES.includes(role.name)) throw new ConsolidatedReportForbiddenError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const [allSchools, faculties, students, allSessions, periodReports] = await Promise.all([
      this.schools.findAll(),
      this.faculties.findAll(),
      this.students.findAll({ isActive: true }),
      this.sessions.findAll(),
      this.reports.findAllByPeriod(period.id),
    ]);

    const now = new Date();
    const schools = allSchools.filter(
      (s) =>
        (!filters.facultyId || s.facultyId === filters.facultyId) &&
        (!filters.schoolId || s.id === filters.schoolId),
    );
    const sessions = allSessions.filter(
      (s) =>
        !s.cancelledAt &&
        s.scheduledAt >= period.startDate &&
        s.scheduledAt <= period.endDate &&
        s.endsAt <= now,
    );

    const body = buildConsolidatedReport({
      schools,
      faculties,
      students,
      sessions,
      reportTutorIds: new Set(periodReports.map((r) => r.tutorId)),
    });
    return {
      periodName: period.name,
      generatedAt: now,
      ...body,
      filterOptions: {
        faculties: faculties.map((f) => ({ id: f.id, name: f.name })),
        schools: allSchools.map((s) => ({ id: s.id, name: s.name, facultyId: s.facultyId })),
      },
    };
  }
}
