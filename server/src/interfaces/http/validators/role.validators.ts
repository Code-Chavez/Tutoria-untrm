import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
  /** Códigos del catálogo de permisos. */
  permissions: z.array(z.string().trim().min(1)).max(200).optional(),
  /** Copia los permisos de un rol existente como punto de partida. */
  copyFromRoleId: z.string().uuid('El rol plantilla debe ser un UUID válido').optional(),
});

export const updateRoleSchema = z
  .object({
    description: z.string().trim().min(1, 'La descripción es obligatoria').optional(),
    permissions: z.array(z.string().trim().min(1)).max(200).optional(),
  })
  .refine((v) => v.description !== undefined || v.permissions !== undefined, { message: 'Indique la descripción o los permisos' });

export const setRoleActiveSchema = z.object({ isActive: z.boolean() });

export const assignRoleSchema = z.object({
  roleId: z.string().uuid('El ID de rol debe ser un UUID válido'),
  service: z.enum(['ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']).nullable().optional(),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').nullable().optional(),
  facultyId: z.string().uuid('La facultad debe ser un UUID válido').nullable().optional(),
});

export const setUserAccessSchema = z.object({
  kind: z.enum(['NONE', 'OWN', 'SCHOOLS', 'FACULTIES', 'INSTITUTION', 'SERVICE']),
  schoolIds: z.array(z.string().uuid('La escuela debe ser un UUID válido')).max(200).optional(),
  facultyIds: z.array(z.string().uuid('La facultad debe ser un UUID válido')).max(50).optional(),
  service: z.enum(['ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']).nullable().optional(),
});

export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type AssignRoleBody = z.infer<typeof assignRoleSchema>;
