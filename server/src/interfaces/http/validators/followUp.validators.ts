import { z } from 'zod';

// Ficha de seguimiento — Anexo N° 5. La obligatoriedad de
// instructorName/courseName/courseCycle cuando withInstructor es true se
// valida en el caso de uso, no aquí (mismo patrón que instructorName/
// courseName en tutoring-requests).
export const createFollowUpSchema = z.object({
  reason: z.string().trim().min(3, 'Describa el motivo del seguimiento').max(1000),
  agreements: z.string().trim().min(3, 'Describa los acuerdos tomados').max(1000),
  withInstructor: z.boolean(),
  instructorName: z.string().trim().max(150).optional(),
  courseName: z.string().trim().max(150).optional(),
  courseCycle: z.coerce.number().int().min(1).max(14).optional(),
});

export type CreateFollowUpBody = z.infer<typeof createFollowUpSchema>;
