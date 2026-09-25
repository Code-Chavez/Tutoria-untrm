import { z } from 'zod';

// Programación de sesión individual — Art. 15.c (duración fija, la asigna el
// servidor a partir del parámetro del sistema, no la envía el cliente).
export const scheduleSessionSchema = z.object({
  studentId: z.string().uuid('El estudiante debe ser un UUID válido'),
  topic: z.string().trim().min(3, 'Indique el tema de la sesión').max(200),
  scheduledAt: z.string().datetime({ message: 'Fecha y hora inválidas' }),
});

export type ScheduleSessionBody = z.infer<typeof scheduleSessionSchema>;
