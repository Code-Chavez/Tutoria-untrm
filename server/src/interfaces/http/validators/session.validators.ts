import { z } from 'zod';

// Programación de sesión individual o grupal — Art. 15.c (duración fija, la
// asigna el servidor a partir del parámetro del sistema, no la envía el
// cliente) y Art. 7.b (la tutoría grupal admite dos o más tutorados).
export const scheduleSessionSchema = z.object({
  studentIds: z
    .array(z.string().uuid('Cada tutorado debe ser un UUID válido'))
    .min(1, 'Selecciona al menos un tutorado')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'No repitas al mismo tutorado en la sesión',
    }),
  topic: z.string().trim().min(3, 'Indique el tema de la sesión').max(200),
  scheduledAt: z.string().datetime({ message: 'Fecha y hora inválidas' }),
});

export type ScheduleSessionBody = z.infer<typeof scheduleSessionSchema>;
