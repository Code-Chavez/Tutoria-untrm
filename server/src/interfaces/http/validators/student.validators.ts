import { z } from 'zod';

// El código universitario de la UNTRM es numérico (8 a 12 dígitos).
const studentCode = z
  .string()
  .trim()
  .regex(/^\d{8,12}$/, 'El código universitario debe tener entre 8 y 12 dígitos numéricos');

export const createStudentSchema = z.object({
  studentCode,
  firstName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'El teléfono es demasiado largo').optional().or(z.literal('')),
  cycle: z.coerce
    .number()
    .int('El ciclo debe ser un número entero')
    .min(1, 'El ciclo mínimo es 1')
    .max(14, 'El ciclo máximo es 14'),
  schoolId: z.string().uuid('El ID de escuela debe ser un UUID válido'),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentBody = z.infer<typeof createStudentSchema>;
export type UpdateStudentBody = z.infer<typeof updateStudentSchema>;
