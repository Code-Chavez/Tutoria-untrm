import { z } from 'zod';

// Apertura/cierre de la evaluación por escuela (HU-38, Art. 17.d).
export const setEvaluationWindowSchema = z.object({
  isOpen: z.boolean(),
});

export type SetEvaluationWindowBody = z.infer<typeof setEvaluationWindowSchema>;
