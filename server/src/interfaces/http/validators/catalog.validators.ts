import { z } from 'zod';
import { CatalogKind } from '@domain/entities/Catalog';

const name = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120);
const isActive = z.boolean().optional();
const date = z.coerce.date();

// Campos de alta por tipo de catálogo (HU-48). En la edición todo es opcional
// y el código (ciclos, servicios, motivos) no se puede cambiar.
const CREATE: Record<CatalogKind, z.ZodObject<z.ZodRawShape>> = {
  faculties: z.object({ name, isActive, requestEmail: z.string().trim().toLowerCase().pipe(z.email()).nullable().optional() }),
  schools: z.object({ name, facultyId: z.string().uuid('La facultad debe ser un UUID válido'), cycleCount: z.number().int().min(1).max(14).optional(), isActive }),
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

export const catalogUpdateSchema = (kind: CatalogKind): z.ZodObject<z.ZodRawShape> => {
  const schema = CREATE[kind];
  // `omit` de una clave que no existe lanza un Error (no un ZodError) y la edición respondía 500: solo se quita `code` donde lo hay.
  const editable = 'code' in schema.shape ? schema.omit({ code: true } as never) : schema;
  return editable.partial() as z.ZodObject<z.ZodRawShape>;
};
