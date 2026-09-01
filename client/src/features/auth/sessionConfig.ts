// Tiempos de expiración de sesión por inactividad. Configurables por entorno
// para poder acortarlos en demos sin tocar el código.
const idleMinutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 15);
const warningSeconds = Number(import.meta.env.VITE_IDLE_WARNING_SECONDS ?? 60);

/** Inactividad tras la cual se muestra el aviso previo. */
export const IDLE_TIMEOUT_MS = idleMinutes * 60_000;

/** Cuenta regresiva del aviso antes del cierre automático. */
export const IDLE_WARNING_MS = warningSeconds * 1_000;
