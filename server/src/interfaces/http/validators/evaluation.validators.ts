import { z } from 'zod';
import { EVALUATION_ITEMS, EVALUATION_SCALE } from '@domain/entities/TutorEvaluation';

// Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7):
// exactamente una respuesta por cada uno de los 20 ítems.
export const submitEvaluationSchema = z.object({
  scores: z
    .array(z.enum(EVALUATION_SCALE))
    .length(
      EVALUATION_ITEMS.length,
      `Debes responder los ${EVALUATION_ITEMS.length} ítems del cuestionario`,
    ),
  likes: z.string().trim().max(1000).optional(),
  dislikes: z.string().trim().max(1000).optional(),
});

export type SubmitEvaluationBody = z.infer<typeof submitEvaluationSchema>;
