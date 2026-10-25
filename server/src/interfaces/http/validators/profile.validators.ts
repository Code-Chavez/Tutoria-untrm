import { z } from 'zod';
import { optionalPhone } from './fields';

export const updateProfileSchema = z.object({
  phone: optionalPhone(),
  photoUrl: z
    .string()
    .trim()
    .url('La URL de la foto no es válida')
    .optional()
    .or(z.literal('')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: (issue) => (issue.input === undefined ? 'La contraseña actual es obligatoria' : undefined) })
      .min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string({ error: (issue) => (issue.input === undefined ? 'La nueva contraseña es obligatoria' : undefined) })
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
