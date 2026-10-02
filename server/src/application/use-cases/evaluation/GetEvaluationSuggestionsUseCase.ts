import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import {
  TutorEvaluationRepository,
  EvaluationSuggestionsFilters,
} from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationSuggestionsReport } from '@application/dtos/evaluation.dto';
import { EvaluationResultsForbiddenError, NoActivePeriodError } from './EvaluationErrors';

/**
 * Sugerencias abiertas consolidadas del cuestionario de evaluación (HU-40):
 * los comentarios "Me gustaría" / "No me gusta" del periodo activo,
 * filtrables por tutor, escuela o facultad, para su análisis por quien
 * administra el programa de tutoría. Misma garantía estructural de
 * anonimato que HU-37/HU-39: el repositorio nunca devuelve el studentId.
 */
export class GetEvaluationSuggestionsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly evaluations: TutorEvaluationRepository,
  ) {}

  async execute(
    requesterId: string,
    filters?: EvaluationSuggestionsFilters,
  ): Promise<EvaluationSuggestionsReport> {
    const requester = await this.users.findById(requesterId);
    if (!requester) throw new EvaluationResultsForbiddenError();

    const role = await this.roles.findById(requester.roleId);
    if (!role || !['Administrador DBU', 'Coordinador'].includes(role.name)) {
      throw new EvaluationResultsForbiddenError();
    }

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const rows = await this.evaluations.findAnonymizedSuggestionsByPeriod(period.id, filters);

    const tutorNames = new Map<string, string>();
    const suggestions = await Promise.all(
      rows.map(async (row) => {
        if (!tutorNames.has(row.tutorId)) {
          const tutor = await this.users.findById(row.tutorId);
          tutorNames.set(row.tutorId, tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Desconocido');
        }
        return {
          tutorId: row.tutorId,
          tutorName: tutorNames.get(row.tutorId) as string,
          likes: row.likes,
          dislikes: row.dislikes,
        };
      }),
    );

    return { periodName: period.name, suggestions };
  }
}
