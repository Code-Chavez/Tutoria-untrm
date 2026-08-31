import { useCallback, useEffect, useRef, useState } from 'react';

interface UseIdleTimerOptions {
  /** Inactividad (ms) tras la cual se entra en fase de aviso. */
  idleMs: number;
  /** Duración (ms) de la cuenta regresiva del aviso. */
  warningMs: number;
  /** Se invoca cuando la cuenta regresiva llega a cero. */
  onExpire: () => void;
}

interface IdleTimerState {
  /** true mientras se muestra el aviso previo al cierre. */
  isWarning: boolean;
  /** Milisegundos restantes de la cuenta regresiva. */
  remainingMs: number;
  /** Cancela el aviso y reinicia el conteo de inactividad. */
  stayActive: () => void;
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

/**
 * Detecta inactividad del usuario. Tras `idleMs` sin actividad muestra un
 * aviso con cuenta regresiva de `warningMs`; si esta se agota, llama a
 * `onExpire`. Durante el aviso la actividad no reinicia el temporizador: hay
 * que confirmar explícitamente con `stayActive`, para que un movimiento
 * accidental del mouse no mantenga viva la sesión.
 *
 * Toda la maquinaria vive dentro de un único efecto con variables locales; los
 * refs solo transportan callbacks y se escriben dentro del efecto, nunca en
 * render.
 */
export function useIdleTimer({ idleMs, warningMs, onExpire }: UseIdleTimerOptions): IdleTimerState {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(warningMs);

  const onExpireRef = useRef(onExpire);
  const stayRef = useRef<() => void>(() => {});

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let idleId: ReturnType<typeof setTimeout> | undefined;
    let countdownId: ReturnType<typeof setInterval> | undefined;
    let inWarning = false;
    let lastActivity = Number.NEGATIVE_INFINITY;

    const clear = () => {
      if (idleId) clearTimeout(idleId);
      if (countdownId) clearInterval(countdownId);
    };

    const arm = () => {
      clear();
      inWarning = false;
      idleId = setTimeout(() => {
        inWarning = true;
        setIsWarning(true);
        const deadline = Date.now() + warningMs;
        setRemainingMs(warningMs);
        countdownId = setInterval(() => {
          const left = deadline - Date.now();
          if (left <= 0) {
            clear();
            onExpireRef.current();
          } else {
            setRemainingMs(left);
          }
        }, 250);
      }, idleMs);
    };

    stayRef.current = () => {
      inWarning = false;
      setIsWarning(false);
      arm();
    };

    // -Infinity: la primera actividad siempre rearma; luego se limita a un
    // rearme por segundo para no reprogramar el timer en cada mousemove.
    const handleActivity = () => {
      if (inWarning) return;
      const now = Date.now();
      if (now - lastActivity < 1000) return;
      lastActivity = now;
      arm();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );
    arm();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      clear();
    };
  }, [idleMs, warningMs]);

  const stayActive = useCallback(() => stayRef.current(), []);

  return { isWarning, remainingMs, stayActive };
}
