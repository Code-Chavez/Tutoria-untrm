import { z } from 'zod';

// III. Motivo de la entrevista — al menos uno debe marcarse (validado en el caso de uso,
// donde el mensaje de error puede referenciar los tres juntos).
export const createInterviewSchema = z.object({
  birthDate: z.string().trim().date('Fecha de nacimiento inválida').optional(),
  originPlace: z.string().trim().max(150).optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  religion: z.string().trim().max(80).optional(),
  maritalStatus: z.string().trim().max(50).optional(),
  siblingsOrder: z.string().trim().max(50).optional(),
  address: z.string().trim().max(200).optional(),
  admissionYear: z.coerce.number().int().min(1980).max(2100).optional(),

  motiveAcademic: z.boolean(),
  motivePersonalEmotional: z.boolean(),
  motiveVocational: z.boolean(),
  motiveDetail: z.string().trim().max(1000).optional(),

  aspectsDiscussed: z
    .string()
    .trim()
    .min(3, 'Describa los aspectos tratados o dificultades manifestadas'),
  agreements: z.string().trim().min(3, 'Describa los acuerdos tomados'),
});

export type CreateInterviewBody = z.infer<typeof createInterviewSchema>;
