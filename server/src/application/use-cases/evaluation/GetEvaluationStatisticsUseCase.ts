import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { appliedFilterLabels, ReportFilters, resolveReportPeriod } from '@application/use-cases/report-filters/reportFilters';
import { EVALUATION_ITEMS, EvaluationScaleCode } from '@domain/entities/TutorEvaluation';
import {
  EvaluationStatisticsReport,
  EvaluationStatisticsTutorRow,
} from '@application/dtos/evaluation.dto';
import { EvaluationResultsForbiddenError } from './EvaluationErrors';

const SCORE_VALUE: Record<EvaluationScaleCode, number> = { N: 1, CN: 2, AV: 3, CS: 4, S: 5 };

/**
 * Estadísticas de evaluación por tutor (HU-39): promedio general y por
 * ítem de cada tutor con al menos una respuesta en el periodo activo,
 * filtrables por escuela o facultad del tutorado que respondió. Misma
 * garantía estructural de anonimato que HU-37: el repositorio nunca
 * devuelve el studentId, con o sin filtro aplicado.
 */
export class GetEvaluationStatisticsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly evaluations: TutorEvaluationRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
  ) {}

  async execute(
    requesterId: string,
    filters: ReportFilters = {},
  ): Promise<EvaluationStatisticsReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationResultsForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Coordinador'].includes(role.name)) {
      throw new EvaluationResultsForbiddenError();
    }

    const period = await resolveReportPeriod(this.periods, filters.periodId);

    // El tutor se filtra después de la consulta: las puntuaciones llegan por
    // tutor y nunca llevan al tutorado que respondió (anonimato estructural).
    const responses = (
      await this.evaluations.findAnonymizedScoresByPeriod(period.id, {
        schoolId: filters.schoolId,
        facultyId: filters.facultyId,
        cycle: filters.cycle,
      })
    ).filter((r) => !filters.tutorId || r.tutorId === filters.tutorId);

    const scoresByTutor = new Map<string, EvaluationScaleCode[][]>();
    for (const response of responses) {
      const list = scoresByTutor.get(response.tutorId) ?? [];
      list.push(response.scores);
      scoresByTutor.set(response.tutorId, list);
    }

    const tutorEntries = await Promise.all(
      [...scoresByTutor.entries()].map(async ([tutorId, scoresList]) => {
        const tutor = await this.users.findById(tutorId);
        return this.buildTutorRow(tutorId, tutor, scoresList);
      }),
    );

    const tutors = tutorEntries.sort((a, b) => a.tutorName.localeCompare(b.tutorName));

    const [schools, faculties] = await Promise.all([this.schools.findAll(), this.faculties.findAll()]);
    const tutorFilter = tutors.find((t) => t.tutorId === filters.tutorId);
    return {
      periodName: period.name,
      tutors,
      appliedFilters: appliedFilterLabels(filters, {
        faculty: faculties.find((f) => f.id === filters.facultyId)?.name,
        school: schools.find((sc) => sc.id === filters.schoolId)?.name,
        tutor: tutorFilter?.tutorName,
      }),
    };
  }

  private buildTutorRow(
    tutorId: string,
    tutor: Awaited<ReturnType<UserRepository['findById']>>,
    scoresList: EvaluationScaleCode[][],
  ): EvaluationStatisticsTutorRow {
    const totalResponses = scoresList.length;

    const items = EVALUATION_ITEMS.map((item, index) => {
      const sum = scoresList.reduce((acc, scores) => acc + SCORE_VALUE[scores[index]], 0);
      return { code: item.code, label: item.label, average: sum / totalResponses };
    });

    const overallAverage = items.reduce((acc, item) => acc + item.average, 0) / items.length;

    return {
      tutorId,
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Desconocido',
      totalResponses,
      overallAverage,
      items,
    };
  }
}
