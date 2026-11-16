/**
 * Vista a la que se vuelve después de iniciar sesión de nuevo cuando la sesión terminó sola (inactividad o sesión vencida).
 * Vive en `sessionStorage`: sobrevive a recargar la pantalla de acceso, pero no pasa a otra pestaña ni a otro día.
 */
const KEY = 'sit:return-to';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
// Pantallas públicas de acceso: volver a ellas no tendría sentido (ni sería seguro tras un enlace de un solo uso).
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/activar-cuenta', '/aceptar-tutoria'];

interface Entry {
  path: string;
  /** Quién tenía la sesión; sin dato (visita directa a una URL protegida) puede volver cualquiera. */
  userId?: string;
  savedAt: number;
}

/** Solo rutas internas de la aplicación: nada de otro sitio, de `//host`, de barras invertidas ni de caracteres de control. */
export function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 2000) return false;
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\p{Cc}]/u.test(path)) return false;
  return !PUBLIC_PATHS.some((p) => path === p || ['/', '?', '#'].some((sep) => path.startsWith(p + sep)));
}

export function rememberReturnTo(path: string, userId?: string | null, now = Date.now()): void {
  if (!isSafeReturnPath(path)) return;
  try {
    const entry: Entry = { path, savedAt: now, ...(userId ? { userId } : {}) };
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Sin almacenamiento disponible (modo privado, bloqueado): se vuelve al inicio, como antes.
  }
}

/** Devuelve la vista guardada y la olvida. Solo vale para la misma persona, mientras no pasen 12 horas y si la ruta es segura. */
export function takeReturnTo(userId: string, now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<Entry>;
    if (!isSafeReturnPath(entry.path)) return null;
    if (typeof entry.savedAt !== 'number' || now - entry.savedAt > MAX_AGE_MS || entry.savedAt > now + 60_000) return null;
    if (entry.userId && entry.userId !== userId) return null;
    return entry.path;
  } catch {
    return null;
  }
}

/** Hay una vista guardada por una sesión que terminó sola (sea o no de la persona que entra ahora). */
export function hasReturnTo(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function forgetReturnTo(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nada que olvidar
  }
}
