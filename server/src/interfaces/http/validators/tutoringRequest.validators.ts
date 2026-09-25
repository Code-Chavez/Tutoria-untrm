import { z } from 'zod';

// Solicitud de tutoría — Art. 19.b (estudiante) / 19.c (docente de asignatura).
export const createTutoringRequestSchema = z.object({
  source: z.enum(['STUDENT', 'INSTRUCTOR']),
  instructorName: z.string().trim().max(150).optional(),
  courseName: z.string().trim().max(150).optional(),
  // Art. 20: tipos de casos a ser tutorados.
  caseType: z.enum(['ACADEMIC', 'PSYCHOLOGICAL', 'SOCIAL', 'HEALTH']),
  reason: z.string().trim().min(3, 'Describa el motivo de la solicitud').max(1000),
});

export type CreateTutoringRequestBody = z.infer<typeof createTutoringRequestSchema>;

// Autoservicio (el propio tutorado): sin origen ni datos de docente, siempre STUDENT.
export const createOwnTutoringRequestSchema = z.object({
  caseType: z.enum(['ACADEMIC', 'PSYCHOLOGICAL', 'SOCIAL', 'HEALTH']),
  reason: z.string().trim().min(3, 'Describa el motivo de la solicitud').max(1000),
});

export type CreateOwnTutoringRequestBody = z.infer<typeof createOwnTutoringRequestSchema>;
