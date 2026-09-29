import { TutorEvaluation, EvaluationScaleCode } from '../entities/TutorEvaluation';

// Una respuesta desvinculada de la identidad (HU-37): expone únicamente las
// puntuaciones, nunca el studentId ni ningún otro dato que permita asociar
// la respuesta a un tutorado en particular.
export interface AnonymizedEvaluationScores {
  scores: EvaluationScaleCode[];
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
}
