/**
 * Borradores de texto que alguien estaba escribiendo (una solicitud, una respuesta, una evaluación): si cambia de pantalla, lo
 * interrumpen o recarga, lo escrito se recupera. Política de privacidad (U07):
 *  - viven en el almacenamiento de la PESTAÑA (sessionStorage), no en el compartido del navegador: se pierden al cerrarla;
 *  - cada borrador es de una persona (la clave lleva su identificador) y se borran todos al cerrar sesión por decisión propia;
 *  - al iniciar sesión se descartan los de cualquier otra persona;
 *  - nunca se envían al servidor.
 */
const PREFIX = 'sit.draft.';

const storage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado: la pantalla funciona igual, sin borrador
  }
};

const keyOf = (userId: string, key: string) => `${PREFIX}${userId}.${key}`;

export function readDraft<T>(userId: string, key: string): T | null {
  try {
    const raw = storage()?.getItem(keyOf(userId, key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(userId: string, key: string, value: unknown): void {
  try {
    storage()?.setItem(keyOf(userId, key), JSON.stringify(value));
  } catch {
    /* sin espacio o bloqueado: no se guarda */
  }
}

export function removeDraft(userId: string, key: string): void {
  try {
    storage()?.removeItem(keyOf(userId, key));
  } catch {
    /* nada que quitar */
  }
}

function removeWhere(keep: (storageKey: string) => boolean): void {
  const s = storage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i += 1) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX) && !keep(k)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    /* nada que quitar */
  }
}

/** Cierre de sesión por decisión de la persona: no queda ningún borrador. */
export const clearAllDrafts = (): void => removeWhere(() => false);

/** Al iniciar sesión: los borradores de otra persona no deben sobrevivir (equipo compartido). */
export const clearDraftsExcept = (userId: string): void => removeWhere((k) => k.startsWith(`${PREFIX}${userId}.`));
