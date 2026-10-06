import { z } from 'zod';
import { CatalogKind } from '@domain/entities/Catalog';

const name = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120);
const isActive = z.boolean().optional();
const date = z.coerce.date();

// Campos de alta por tipo de catálogo (HU-48). En la edición todo es opcional
// y el código (ciclos, servicios, motivos) no se puede cambiar.
const CREATE: Record<CatalogKind, z.ZodObject<z.ZodRawShape>> = {
  faculties: z.object({ name, isActive }),
  schools: z.object({ name, facultyId: z.string().uuid('La facultad debe ser un UUID válido'), isActive }),
  periods: z.object({ name, startDate: date, endDate: date, isActive }),
  cycles: z.object({
    name,
    code: z.string().regex(/^(?:[1-9]|1[0-4])$/, 'El ciclo debe ser un número del 1 al 14'),
    isActive,
  }),
  services: z.object({
    name,
    code: z.string().regex(/^[A-Z][A-Z_]{1,29}$/, 'Use MAYÚSCULAS y guiones bajos (p. ej. ASISTENCIA_SOCIAL)'),
    isActive,
  }),
  motives: z.object({
    name,
    code: z.string().regex(/^[A-Z][A-Z_]{1,29}$/, 'Use MAYÚSCULAS y guiones bajos (p. ej. PERSONAL_EMOTIONAL)'),
    isActive,
  }),
};

export const catalogCreateSchema = (kind: CatalogKind) => CREATE[kind];

export const catalogUpdateSchema = (kind: CatalogKind) =>
  CREATE[kind].omit({ code: true } as never).partial() as z.ZodObject<z.ZodRawShape>;
