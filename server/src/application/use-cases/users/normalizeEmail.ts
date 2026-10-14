/** Forma única del correo: sin espacios exteriores y en minúsculas, para que alta, edición, ingreso y recuperación coincidan. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
