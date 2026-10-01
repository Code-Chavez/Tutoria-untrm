import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import {
  TutorEvaluationRepository,
  EvaluationStatisticsFilters,
} from '@domain/repositories/TutorEvaluationRepository';
import { EVALUATION_ITEMS, EvaluationScaleCode } from '@domain/entities/TutorEvaluation';
import {
  EvaluationStatisticsReport,
  EvaluationStatisticsTutorRow,
} from '@application/dtos/evaluation.dto';
import { EvaluationResultsForbiddenError, NoActivePeriodError } from './EvaluationErrors';

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
  ) {}

  async execute(
    requesterId: string,
    filters?: EvaluationStatisticsFilters,
  ): Promise<EvaluationStatisticsReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationResultsForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Coordinador'].includes(role.name)) {
      throw new EvaluationResultsForbiddenError();
    }

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const responses = await this.evaluations.findAnonymizedScoresByPeriod(period.id, filters);

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

    return { periodName: period.name, tutors };
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
