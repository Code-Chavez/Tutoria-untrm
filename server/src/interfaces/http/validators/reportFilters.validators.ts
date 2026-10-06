import { z } from 'zod';

// Los controles de filtro envían "" para "todos": se tratan como ausentes.
const optionalText = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

// Filtros combinados de los reportes (HU-47).
export const reportFiltersQuerySchema = z.object({
  periodId: optionalText,
  facultyId: optionalText,
  schoolId: optionalText,
  cycle: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(12).optional(),
  ),
  tutorId: optionalText,
});

export type ReportFiltersQuery = z.infer<typeof reportFiltersQuerySchema>;
