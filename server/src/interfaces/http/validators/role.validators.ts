import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
});

export const assignRoleSchema = z.object({
  roleId: z.string().uuid('El ID de rol debe ser un UUID válido'),
  service: z.enum(['ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']).nullable().optional(),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').nullable().optional(),
});

export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type AssignRoleBody = z.infer<typeof assignRoleSchema>;
