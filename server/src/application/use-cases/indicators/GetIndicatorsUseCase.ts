import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationScaleCode } from '@domain/entities/TutorEvaluation';
import { appliedFilterLabels, ReportFilters, resolveReportPeriod } from '@application/use-cases/report-filters/reportFilters';
import { buildIndicators, IndicatorsReport } from './buildIndicators';
import { IndicatorsForbiddenError } from './IndicatorsErrors';

export type IndicatorsFilters = ReportFilters;

/**
 * Indicadores del tablero (HU-45): DBU y Vicerrectorado ven todas las
 * escuelas; el Coordinador, solo las que coordina. Los resultados de
 * evaluación se exponen únicamente agregados.
 */
export class GetIndicatorsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly sessions: SessionRepository,
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly referrals: StudentReferralRepository,
    private readonly evaluations: TutorEvaluationRepository,
  ) {}

  async execute(requesterId: string, filters: IndicatorsFilters = {}): Promise<IndicatorsReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new IndicatorsForbiddenError();
    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Vicerrectorado', 'Coordinador'].includes(role.name)) {
      throw new IndicatorsForbiddenError();
    }

    const period = await resolveReportPeriod(this.periods, filters.periodId);

    const [allSchools, faculties, allStudents, allSessions, allReferrals] = await Promise.all([
      this.schools.findAll(),
      this.faculties.findAll(),
      this.students.findAll({ isActive: true }),
      this.sessions.findAll(),
      this.referrals.findMany({}),
    ]);

    // Alcance del rol: el Coordinador solo ve las escuelas que coordina.
    const scopeSchools =
      role.name === 'Coordinador'
        ? allSchools.filter((s) => s.coordinatorId === requesterId)
        : allSchools;
    const scopeIds = new Set(scopeSchools.map((s) => s.id));
    const scopeStudents = allStudents.filter((s) => scopeIds.has(s.schoolId));

    const schools = scopeSchools.filter(
      (s) =>
        (!filters.facultyId || s.facultyId === filters.facultyId) &&
        (!filters.schoolId || s.id === filters.schoolId),
    );
    const schoolIds = new Set(schools.map((s) => s.id));
    const students = scopeStudents.filter(
      (s) => schoolIds.has(s.schoolId) && (!filters.tutorId || s.tutorId === filters.tutorId) &&
        (filters.cycle === undefined || s.cycle === filters.cycle),
    );

    const now = new Date();
    const sessions = allSessions.filter(
      (s) =>
        !s.cancelledAt &&
        s.scheduledAt >= period.startDate &&
        s.scheduledAt <= period.endDate &&
        s.endsAt <= now &&
        (!filters.tutorId || s.tutorId === filters.tutorId),
    );
    const referrals = allReferrals.filter(
      (r) => r.createdAt >= period.startDate && r.createdAt <= period.endDate,
    );

    const evaluationScores = await this.loadEvaluationScores(period.id, schools, allSchools, filters);

    const body = buildIndicators({ schools, students, sessions, referrals, evaluationScores });

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

  // Las puntuaciones llegan sin tutorado (anonimato estructural); el alcance
  // se resuelve por escuela en la consulta y el tutor se filtra después.
  private async loadEvaluationScores(
    periodId: string,
    schools: { id: string }[],
    allSchools: { id: string }[],
    filters: IndicatorsFilters,
  ): Promise<EvaluationScaleCode[][]> {
    // Sin filtro solo si se consultan TODAS las escuelas del sistema; un
    // alcance parcial (Coordinador o filtro) se resuelve escuela por escuela.
    const allSelected = schools.length === allSchools.length;
    const cycle = filters.cycle === undefined ? {} : { cycle: filters.cycle };
    const batches = allSelected
      ? [
          await (filters.cycle === undefined
            ? this.evaluations.findAnonymizedScoresByPeriod(periodId)
            : this.evaluations.findAnonymizedScoresByPeriod(periodId, cycle)),
        ]
      : await Promise.all(
          schools.map((s) =>
            this.evaluations.findAnonymizedScoresByPeriod(periodId, { schoolId: s.id, ...cycle }),
          ),
        );
    return batches
      .flat()
      .filter((r) => !filters.tutorId || r.tutorId === filters.tutorId)
      .map((r) => r.scores);
  }
}
