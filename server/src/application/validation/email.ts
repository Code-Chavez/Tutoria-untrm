import { z } from 'zod';

/**
 * Reglas del correo, en un solo lugar: las usan los formularios (HTTP), la carga masiva y los casos de uso, para que todos
 * acepten y rechacen lo mismo y lo guarden con la misma forma.
 *
 * Tres niveles, de menor a mayor exigencia:
 *  1. Normalización: sin espacios exteriores y en minúsculas (`Ana@UNTRM.edu.pe ` y `ana@untrm.edu.pe` son el mismo correo).
 *  2. Formato: tiene forma de correo y cabe en 254 caracteres.
 *  3. Dominio institucional (RF-01): solo para las **cuentas de usuario** (lo que sirve para ingresar). El correo de contacto
 *     de un estudiante o el destino de una escuela solo pasan los niveles 1 y 2: muchos estudiantes usan correo personal.
 */
export const EMAIL_MAX = 254;
export const EMAIL_INVALID = 'El correo no tiene un formato válido';

/** Forma única del correo: sin espacios exteriores y en minúsculas, para que alta, edición, ingreso y recuperación coincidan. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** ¿Tiene forma de correo (ya normalizado) y cabe en el máximo? */
export function isValidEmailFormat(email: string): boolean {
  return email.length > 0 && email.length <= EMAIL_MAX && z.string().email().safeParse(email).success;
}

/** Correo opcional: vacío es válido; si viene, debe tener formato de correo. */
export function isValidOptionalEmail(value: string): boolean {
  if (!value) return true;
  return isValidEmailFormat(normalizeEmail(value));
}

/** Campo de correo de un formulario HTTP: se normaliza antes de validar, para no rechazar un correo bueno por un espacio. */
export const emailField = (message = EMAIL_INVALID) => z.string().trim().toLowerCase().max(EMAIL_MAX, message).email(message);

export const DEFAULT_ALLOWED_DOMAINS: readonly string[] = ['untrm.edu.pe'];

/** Política de dominio de las cuentas de usuario (RF-01). Se configura al desplegar (EMAIL_ALLOWED_DOMAINS), no en el código. */
export interface EmailPolicy {
  readonly allowedDomains: readonly string[];
}

const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * Lista de dominios permitidos a partir del texto configurado («untrm.edu.pe, otra.edu.pe»): separada por comas o espacios,
 * sin «@», en minúsculas y sin repetidos. Vacío usa el dominio institucional; un dominio mal escrito es un error (no se
 * ignora en silencio: dejaría la política más abierta o más cerrada de lo que se quiso).
 */
export function parseAllowedDomains(raw: string | undefined): string[] {
  const entries = (raw ?? '')
    .split(/[,\s;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  if (entries.length === 0) return [...DEFAULT_ALLOWED_DOMAINS];
  const invalid = entries.filter((d) => !DOMAIN_PATTERN.test(d));
  if (invalid.length > 0) throw new Error(`EMAIL_ALLOWED_DOMAINS tiene dominios inválidos: ${invalid.join(', ')}`);
  return [...new Set(entries)];
}

export const createEmailPolicy = (raw: string | undefined): EmailPolicy => ({ allowedDomains: parseAllowedDomains(raw) });

export function emailDomainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1);
}

/** Texto para la persona: «El correo debe ser institucional (@untrm.edu.pe)». */
export function emailDomainMessage(policy: EmailPolicy): string {
  return `El correo debe ser institucional (${policy.allowedDomains.map((d) => `@${d}`).join(' o ')})`;
}

/** Devuelve el problema (texto para la persona) de un correo de cuenta de usuario, o null si es válido. */
export function accountEmailProblem(rawEmail: string, policy: EmailPolicy): string | null {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmailFormat(email)) return `${EMAIL_INVALID}${email ? ` («${email}»)` : ''}`;
  return policy.allowedDomains.includes(emailDomainOf(email)) ? null : `${emailDomainMessage(policy)} («${email}»)`;
}
