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

// Vincular/desvincular la cuenta de portal (rol Tutorado) de un estudiante.
export const linkPortalAccountSchema = z.object({
  userId: z.string().uuid('El ID de usuario debe ser un UUID válido').nullable(),
});

// Marcado de riesgo académico (HU-11).
export const markStudentRiskSchema = z.object({
  isAtRisk: z.boolean(),
  reason: z.string().trim().max(500, 'El motivo es demasiado largo').optional(),
});

// Reporte de carga masiva enviado por el cliente para exportarlo a Excel (HU-09).
export const importReportSchema = z.object({
  totalRows: z.number().int().min(0),
  created: z.number().int().min(0),
  skipped: z.number().int().min(0),
  createdRows: z
    .array(
      z.object({
        row: z.number().int(),
        studentCode: z.string(),
        fullName: z.string(),
      }),
    )
    .max(20000),
  errors: z
    .array(
      z.object({
        row: z.number().int(),
        studentCode: z.string().optional(),
        message: z.string(),
      }),
    )
    .max(20000),
});

export type CreateStudentBody = z.infer<typeof createStudentSchema>;
export type UpdateStudentBody = z.infer<typeof updateStudentSchema>;
