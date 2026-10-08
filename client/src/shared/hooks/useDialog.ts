import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Foco de un diálogo modal: al abrir pasa al primer campo (o al propio diálogo), Tab y Shift+Tab
 * no salen de él y al cerrar el foco vuelve al control que lo abrió. Devuelve el ref que se
 * asigna al elemento con role="dialog".
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const items = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items().find((el) => !el.matches('[aria-label="Cerrar"]')) ?? items()[0];
    (first ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = items();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const head = focusable[0];
      const tail = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === head || active === dialog)) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && active === tail) {
        event.preventDefault();
        head.focus();
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return ref;
}

/** Foco del diálogo más cierre con Escape, para los que aún no lo manejaban. */
export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useDialogFocus<T>();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ref;
}
