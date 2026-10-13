import { z } from 'zod';
import { PHONE_INVALID, STUDENT_PHONE_MAX, STUDENT_PHONE_PATTERN } from '@application/validation/studentFields';

/** Nombre o apellido de una persona: con tildes, apóstrofes y espacios interiores; sin espacios sobrantes ni solo espacios. */
export const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} debe tener al menos 2 caracteres`)
    .max(100, `${label} es demasiado largo (máximo 100 caracteres)`);

/** Teléfono opcional (vacío permitido): solo caracteres de teléfono y longitud acotada, igual que en los tutorados. */
export const optionalPhone = () =>
  z.string().trim().max(STUDENT_PHONE_MAX, PHONE_INVALID).regex(STUDENT_PHONE_PATTERN, PHONE_INVALID).optional().or(z.literal(''));

/** Teléfono obligatorio de al menos 6 caracteres. */
export const requiredPhone = () =>
  z
    .string()
    .trim()
    .min(6, 'Ingrese un celular válido')
    .max(STUDENT_PHONE_MAX, PHONE_INVALID)
    .regex(STUDENT_PHONE_PATTERN, PHONE_INVALID);
