import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type Patch = Record<string, string | null | undefined>;

/** Un cambio pedido que el router todavía no dibuja se descarta de la espera pasado este tiempo (lo pudo reemplazar otra navegación). */
const PENDING_TTL_MS = 2000;

/**
 * El estado de una pantalla que conviene conservar al recargar, compartir el enlace o volver con «atrás» (filtros, qué ventana
 * está abierta y sobre qué registro) vive en la URL, no en el estado del componente. `set` cambia solo los parámetros indicados
 * y respeta los demás; un valor vacío o nulo quita el parámetro. Por omisión crea una entrada del historial (abrir una ventana);
 * para lo que se escribe mientras se teclea (filtros) o para cerrar, usar `replace`.
 *
 * Varias llamadas a `set` se componen (cada una parte de lo último PEDIDO, no de lo último dibujado), a diferencia de la forma
 * funcional de `setSearchParams`, que parte siempre de lo último dibujado. Eso incluye cambios en eventos distintos que llegan antes de
 * que el router termine de dibujar el anterior (escribir en la búsqueda y elegir un filtro enseguida): el dibujado de un cambio viejo
 * puede confirmarse cuando ya se pidió el siguiente, y no debe devolver la base a un estado anterior (issue #255).
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();
  // `drawn`: lo último que el router dibujó y que no es un dibujado viejo. `requested`: lo último que se pidió; `pending`: lo pedido que
  // aún no se vio dibujado, en orden.
  const drawn = useRef(params);
  const requested = useRef(params);
  const pending = useRef<{ search: string; at: number }[]>([]);

  useEffect(() => {
    const now = Date.now();
    pending.current = pending.current.filter((entry) => now - entry.at < PENDING_TTL_MS);
    const search = params.toString();
    const index = pending.current.findIndex((entry) => entry.search === search);
    if (index >= 0) pending.current.splice(0, index + 1); // el router dibujó uno de nuestros cambios: los anteriores ya están dibujados
    else if (pending.current.length > 0) return; // un dibujado viejo mientras hay cambios pendientes: no pisa lo que se pidió después
    drawn.current = params;
  }, [params]);

  // Atrás y Adelante: la dirección a la que se navegó manda. Lo que se había pedido y aún no se dibujaba queda sin efecto (la navegación del
  // historial lo reemplaza), y el siguiente cambio parte de esa dirección, sin esperar a que el router la dibuje.
  useEffect(() => {
    const onHistoryNavigation = () => {
      const current = new URLSearchParams(window.location.search);
      pending.current = [];
      drawn.current = current;
      requested.current = current;
    };
    window.addEventListener('popstate', onHistoryNavigation);
    return () => window.removeEventListener('popstate', onHistoryNavigation);
  }, []);

  const get = useCallback((key: string) => params.get(key) ?? '', [params]);

  const set = useCallback(
    (patch: Patch, options?: { replace?: boolean }) => {
      const now = Date.now();
      pending.current = pending.current.filter((entry) => now - entry.at < PENDING_TTL_MS);
      const next = new URLSearchParams(pending.current.length > 0 ? requested.current : drawn.current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Un cambio que no modifica la URL no genera un dibujado nuevo: no se deja esperándolo.
      const search = next.toString();
      const base = pending.current.length > 0 ? requested.current : drawn.current;
      if (search !== base.toString()) pending.current.push({ search, at: now });
      requested.current = next;
      setParams(next, { replace: options?.replace ?? false });
    },
    [setParams],
  );

  return { get, set };
}
