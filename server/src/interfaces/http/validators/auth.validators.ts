import { z } from 'zod';

// El correo se normaliza antes de validar su formato: «  Ana@UNTRM.edu.pe » entra igual que «ana@untrm.edu.pe».
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del email no es válido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginBody = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refresh token es obligatorio' })
    .min(1, 'El refresh token es obligatorio'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del email no es válido'),
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'El token es obligatorio' }),
  newPassword: z
    .string({ required_error: 'La nueva contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
