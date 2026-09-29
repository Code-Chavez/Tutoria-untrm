import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { EVALUATION_ITEMS, EvaluationScaleCode } from '@domain/entities/TutorEvaluation';
import { TutorEvaluationResults, EvaluationItemResult } from '@application/dtos/evaluation.dto';
import { NoActivePeriodError, EvaluationResultsForbiddenError, TutorNotFoundError } from './EvaluationErrors';

const SCORE_VALUE: Record<EvaluationScaleCode, number> = { N: 1, CN: 2, AV: 3, CS: 4, S: 5 };

function emptyDistribution(): Record<EvaluationScaleCode, number> {
  return { N: 0, CN: 0, AV: 0, CS: 0, S: 0 };
}

/**
 * Resultados agregados del cuestionario de evaluación (HU-37, Art. 22
 * confidencialidad): promedio y distribución por ítem para un tutor en el
 * periodo activo. Restringido a quien administra el programa (Administrador
 * DBU, Coordinador) — nunca al propio tutor evaluado ni a nadie más.
 *
 * La anonimización no es un filtro aplicado aquí: es estructural. Este caso
 * de uso solo puede leer `entry.scores` de cada respuesta porque
 * `AnonymizedEvaluationScores` no tiene ningún otro campo — el repositorio
 * (`findAnonymizedScoresByTutorAndPeriod`) ya excluyó studentId a nivel de
 * consulta SQL, así que no hay forma de que este código, ni uno futuro que
 * lo modifique por error, vuelva a exponerlo.
 */
export class GetEvaluationResultsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly evaluations: TutorEvaluationRepository,
  ) {}

  async execute(requesterId: string, tutorId: string): Promise<TutorEvaluationResults> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationResultsForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Coordinador'].includes(role.name)) {
      throw new EvaluationResultsForbiddenError();
    }

    const tutor = await this.users.findById(tutorId);
    if (!tutor) throw new TutorNotFoundError();

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const responses = await this.evaluations.findAnonymizedScoresByTutorAndPeriod(tutorId, period.id);
    const totalResponses = responses.length;

    const items: EvaluationItemResult[] = EVALUATION_ITEMS.map((item, index) => {
      const distribution = emptyDistribution();
      let sum = 0;
      for (const response of responses) {
        const code = response.scores[index];
        distribution[code] += 1;
        sum += SCORE_VALUE[code];
      }
      return {
        code: item.code,
        label: item.label,
        average: totalResponses > 0 ? sum / totalResponses : null,
        distribution,
      };
    });

    const overallAverage =
      totalResponses > 0
        ? items.reduce((acc, item) => acc + (item.average ?? 0), 0) / items.length
        : null;

    return {
      tutorId,
      tutorName: `${tutor.firstName} ${tutor.lastName}`,
      periodName: period.name,
      totalResponses,
      overallAverage,
      items,
    };
  }
}

