import { z } from 'zod';
import { requiredPhone } from './fields';

// Persona de red de apoyo — Anexo N° 3, sección II.
export const upsertSupportContactSchema = z.object({
  fullName: z.string().trim().min(2, 'Ingrese los apellidos y nombres').max(150, 'El nombre es demasiado largo'),
  relationship: z.string().trim().min(2, 'Ingrese el parentesco o vínculo').max(80, 'El parentesco es demasiado largo'),
  age: z.coerce.number().int().min(0).max(120).optional(),
  occupation: z.string().trim().max(100).optional(),
  phone: requiredPhone(),
});

export type UpsertSupportContactBody = z.infer<typeof upsertSupportContactSchema>;
