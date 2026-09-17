import { z } from 'zod';

// Persona de red de apoyo — Anexo N° 3, sección II.
export const upsertSupportContactSchema = z.object({
  fullName: z.string().trim().min(2, 'Ingrese los apellidos y nombres'),
  relationship: z.string().trim().min(2, 'Ingrese el parentesco o vínculo'),
  age: z.coerce.number().int().min(0).max(120).optional(),
  occupation: z.string().trim().max(100).optional(),
  phone: z
    .string()
    .trim()
    .min(6, 'Ingrese un celular válido')
    .max(20, 'El celular es demasiado largo'),
});

export type UpsertSupportContactBody = z.infer<typeof upsertSupportContactSchema>;
