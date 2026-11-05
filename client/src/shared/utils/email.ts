// Las mismas reglas del correo que aplica el servidor (server/src/application/validation/email.ts), para avisar en el
// formulario antes de enviar. El servidor sigue siendo quien decide.
export const EMAIL_MAX = 254;
export const EMAIL_INVALID = 'El correo no tiene un formato válido';

/** Forma única del correo: sin espacios exteriores y en minúsculas. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** ¿Tiene forma de correo (ya normalizado) y cabe en el máximo? */
export const isValidEmailFormat = (email: string): boolean => email.length > 0 && email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** «El correo debe ser institucional (@untrm.edu.pe)» / «… (@untrm.edu.pe o @externo.org)». */
export const emailDomainMessage = (domains: readonly string[]): string => `El correo debe ser institucional (${domains.map((d) => `@${d}`).join(' o ')})`;

/**
 * Problema de un correo de cuenta de usuario (formato o dominio), o null si es válido. Sin dominios cargados todavía solo se
 * revisa el formato.
 */
export function accountEmailProblem(rawEmail: string, domains: readonly string[] | undefined): string | null {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmailFormat(email)) return EMAIL_INVALID;
  if (domains && domains.length > 0 && !domains.includes(email.slice(email.lastIndexOf('@') + 1))) return emailDomainMessage(domains);
  return null;
}
