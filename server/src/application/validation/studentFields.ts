import { EMAIL_INVALID, EMAIL_MAX, isValidOptionalEmail } from './email';

// Las reglas del correo viven en un solo módulo (email.ts); se reexportan aquí para quien ya las importaba de este archivo.
export { EMAIL_INVALID, isValidOptionalEmail };

/**
 * Reglas de los datos de un estudiante, compartidas por el formulario (HTTP) y la carga masiva para que ambos
 * acepten y rechacen lo mismo (A03). Los textos de error son los que ve la persona.
 */
export const STUDENT_NAME_MIN = 2;
export const STUDENT_PHONE_MAX = 20;
export const STUDENT_EMAIL_MAX = EMAIL_MAX;

// Dígitos, +, paréntesis, espacios y guiones: cubre «987654321» y «+51 987 654 321», no letras.
export const STUDENT_PHONE_PATTERN = /^[0-9+()\s-]+$/;

export const NAME_TOO_SHORT = `debe tener al menos ${STUDENT_NAME_MIN} caracteres`;
export const PHONE_INVALID = `El teléfono solo admite números, +, espacios, guiones y paréntesis (máximo ${STUDENT_PHONE_MAX} caracteres)`;

/** Teléfono opcional: vacío es válido; si viene, solo caracteres de teléfono y longitud acotada. */
export function isValidOptionalPhone(value: string): boolean {
  if (!value) return true;
  return value.length <= STUDENT_PHONE_MAX && STUDENT_PHONE_PATTERN.test(value);
}
