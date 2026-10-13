import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import {
  TutorEvaluationRepository,
  EvaluationSuggestionsFilters,
} from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationSuggestionsReport } from '@application/dtos/evaluation.dto';
import { NoActivePeriodError } from './EvaluationErrors';
import { evaluationScopeFor } from './evaluationScope';

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
    private readonly schools: SchoolRepository,
  ) {}

  async execute(
    requesterId: string,
    filters?: EvaluationSuggestionsFilters,
  ): Promise<EvaluationSuggestionsReport> {
    const scope = await evaluationScopeFor(this.users, this.roles, this.schools, requesterId);

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const rows = await this.evaluations.findAnonymizedSuggestionsByPeriod(period.id, { ...filters, schoolIds: scope.schoolIds });

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
