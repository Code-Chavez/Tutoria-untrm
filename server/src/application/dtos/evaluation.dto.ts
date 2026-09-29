import { EvaluationScaleCode } from '@domain/entities/TutorEvaluation';

export interface SubmitEvaluationInput {
  // 20 respuestas, en el mismo orden de EVALUATION_ITEMS.
  scores: EvaluationScaleCode[];
  likes?: string;
  dislikes?: string;
}

export interface EvaluationStatus {
  // false si no hay periodo habilitado (HU-38) o el tutorado no tiene tutor.
  canRespond: boolean;
  alreadyResponded: boolean;
  periodName: string | null;
}
