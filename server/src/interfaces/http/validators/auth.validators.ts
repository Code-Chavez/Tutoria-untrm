import { z } from 'zod';

// El correo se normaliza antes de validar su formato: «  Ana@UNTRM.edu.pe » entra igual que «ana@untrm.edu.pe».
export const loginSchema = z.object({
  email: z
    .string({ error: (issue) => (issue.input === undefined ? 'El email es obligatorio' : undefined) })
    .trim()
    .toLowerCase()
    .email('El formato del email no es válido'),
  password: z
    .string({ error: (issue) => (issue.input === undefined ? 'La contraseña es obligatoria' : undefined) })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginBody = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z
    .string({ error: (issue) => (issue.input === undefined ? 'El refresh token es obligatorio' : undefined) })
    .min(1, 'El refresh token es obligatorio'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: (issue) => (issue.input === undefined ? 'El email es obligatorio' : undefined) })
    .trim()
    .toLowerCase()
    .email('El formato del email no es válido'),
});

export const resetPasswordSchema = z.object({
  token: z.string({ error: (issue) => (issue.input === undefined ? 'El token es obligatorio' : undefined) }),
  newPassword: z
    .string({ error: (issue) => (issue.input === undefined ? 'La nueva contraseña es obligatoria' : undefined) })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
