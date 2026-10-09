import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import { PeriodRosterRepository } from '@domain/repositories/PeriodRosterRepository';
import { appliedFilterLabels, ReportFilters, resolveReportPeriod } from '@application/use-cases/report-filters/reportFilters';
import { buildConsolidatedReport, ConsolidatedReport } from './buildConsolidatedReport';
import { isHeldSession } from '@application/use-cases/sessions/sessionOutcome';
import { ConsolidatedReportForbiddenError } from './ConsolidatedReportErrors';

export type ConsolidatedReportFilters = ReportFilters;

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
    private readonly rosters: PeriodRosterRepository,
  ) {}

  async execute(
    requesterId: string,
    filters: ConsolidatedReportFilters = {},
  ): Promise<ConsolidatedReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new ConsolidatedReportForbiddenError();
    const role = await this.roles.findById(requester.roleId);
    if (!role || !ALLOWED_ROLES.includes(role.name)) throw new ConsolidatedReportForbiddenError();

    const period = await resolveReportPeriod(this.periods, filters.periodId);

    const [allSchools, faculties, allStudents, allSessions, periodReports] = await Promise.all([
      this.schools.findAll(),
      this.faculties.findAll(),
      // Un semestre cerrado se lee de su corte; el vigente, de la matrícula actual (A17).
      this.rosters.findByPeriod(period.id).then((roster) => roster ?? this.students.findAll({ isActive: true })),
      this.sessions.findAll(),
      this.reports.findAllByPeriod(period.id),
    ]);

    const now = new Date();
    const schools = allSchools.filter(
      (s) =>
        (!filters.facultyId || s.facultyId === filters.facultyId) &&
        (!filters.schoolId || s.id === filters.schoolId),
    );
    const students = allStudents.filter(
      (s) =>
        s.isActive &&
        (filters.cycle === undefined || s.cycle === filters.cycle) &&
        (!filters.tutorId || s.tutorId === filters.tutorId),
    );
    const sessions = allSessions.filter(
      // «Realizada» = consta que asistió alguien (A07); haber pasado la hora no basta.
      (s) =>
        isHeldSession(s, now) &&
        (!filters.tutorId || s.tutorId === filters.tutorId) &&
        s.scheduledAt >= period.startDate &&
        s.scheduledAt <= period.endDate,
    );

    const body = buildConsolidatedReport({
      schools,
      faculties,
      students,
      sessions,
      reportTutorIds: new Set(periodReports.map((r) => r.tutorId)),
    });
    const tutor = filters.tutorId ? await this.users.findById(filters.tutorId) : null;
    return {
      periodName: period.name,
      generatedAt: now,
      ...body,
      appliedFilters: appliedFilterLabels(filters, {
        faculty: faculties.find((f) => f.id === filters.facultyId)?.name,
        school: allSchools.find((s) => s.id === filters.schoolId)?.name,
        tutor: tutor ? `${tutor.firstName} ${tutor.lastName}` : undefined,
      }),
    };
  }
}
