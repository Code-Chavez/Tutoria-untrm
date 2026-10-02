import { TutorEvaluation, EvaluationScaleCode } from '../entities/TutorEvaluation';

// Una respuesta desvinculada de la identidad (HU-37): expone únicamente las
// puntuaciones, nunca el studentId ni ningún otro dato que permita asociar
// la respuesta a un tutorado en particular.
export interface AnonymizedEvaluationScores {
  scores: EvaluationScaleCode[];
}

// Igual que AnonymizedEvaluationScores, pero conservando a qué tutor
// corresponde cada respuesta (HU-39: estadísticas agrupadas por tutor).
// El tutorId no identifica al tutorado que respondió, así que no compromete
// el anonimato.
export interface AnonymizedEvaluationScoresByTutor {
  tutorId: string;
  scores: EvaluationScaleCode[];
}

export interface EvaluationStatisticsFilters {
  schoolId?: string;
  facultyId?: string;
}

export interface EvaluationSuggestionsFilters {
  tutorId?: string;
  schoolId?: string;
  facultyId?: string;
}

// Sugerencias abiertas desvinculadas de la identidad (HU-40): conserva a
// qué tutor corresponde cada comentario (igual que HU-39), pero nunca el
// tutorado que lo escribió.
export interface AnonymizedEvaluationSuggestion {
  tutorId: string;
  likes: string | null;
  dislikes: string | null;
}

export interface TutorEvaluationRepository {
  create(
    data: Omit<TutorEvaluation, 'id' | 'createdAt'>,
  ): Promise<TutorEvaluation>;
  findByStudentAndPeriod(studentId: string, periodId: string): Promise<TutorEvaluation | null>;
  /**
   * Puntuaciones de todas las respuestas de un tutor en un periodo, sin
   * ningún campo identificador del tutorado (HU-37).
   */
  findAnonymizedScoresByTutorAndPeriod(
    tutorId: string,
    periodId: string,
  ): Promise<AnonymizedEvaluationScores[]>;
  /**
   * Puntuaciones de todas las respuestas del periodo, agrupables por tutor,
   * filtrando opcionalmente por la escuela o facultad del tutorado que
   * respondió (HU-39). El filtro nunca expone al tutorado: se resuelve en
   * el `where` de la consulta, no en los campos devueltos.
   */
  findAnonymizedScoresByPeriod(
    periodId: string,
    filters?: EvaluationStatisticsFilters,
  ): Promise<AnonymizedEvaluationScoresByTutor[]>;
  /**
   * Comentarios abiertos ("Me gustaría" / "No me gusta") de las respuestas
   * del periodo que tengan al menos uno de los dos no vacío, filtrables por
   * tutor, escuela o facultad (HU-40). Mismo criterio de anonimato que
   * findAnonymizedScoresByPeriod.
   */
  findAnonymizedSuggestionsByPeriod(
    periodId: string,
    filters?: EvaluationSuggestionsFilters,
  ): Promise<AnonymizedEvaluationSuggestion[]>;
}
