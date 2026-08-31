import { z } from 'zod';

export const updateProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20, 'El teléfono no puede exceder los 20 caracteres')
    .optional()
    .or(z.literal('')),
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
      .string({ required_error: 'La contraseña actual es obligatoria' })
      .min(1, 'La contraseña actual es obligatoria'),
    newPassword: z
      .string({ required_error: 'La nueva contraseña es obligatoria' })
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
