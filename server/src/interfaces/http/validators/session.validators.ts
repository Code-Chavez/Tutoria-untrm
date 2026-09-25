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
  // Modalidad (Art. 8): la obligatoriedad de location/meetingLink según el
  // valor elegido se valida en el caso de uso, no aquí (mismo patrón que
  // instructorName/courseName en tutoring-requests).
  modality: z.enum(['PRESENCIAL', 'VIRTUAL']),
  location: z.string().trim().max(200).optional(),
  meetingLink: z.string().trim().max(500).optional(),
});

export type ScheduleSessionBody = z.infer<typeof scheduleSessionSchema>;

// Reprogramación y cancelación (HU-23): ambas exigen motivo (Art. 24-símil,
// trazabilidad de cambios).
export const rescheduleSessionSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'Fecha y hora inválidas' }),
  reason: z.string().trim().min(3, 'Indique el motivo de la reprogramación').max(500),
});

export const cancelSessionSchema = z.object({
  reason: z.string().trim().min(3, 'Indique el motivo de la cancelación').max(500),
});

export type RescheduleSessionBody = z.infer<typeof rescheduleSessionSchema>;
export type CancelSessionBody = z.infer<typeof cancelSessionSchema>;
