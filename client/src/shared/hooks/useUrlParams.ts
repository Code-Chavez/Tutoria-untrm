import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type Patch = Record<string, string | null | undefined>;

/**
 * El estado de una pantalla que conviene conservar al recargar, compartir el enlace o volver con «atrás» (filtros, qué ventana
 * está abierta y sobre qué registro) vive en la URL, no en el estado del componente. `set` cambia solo los parámetros indicados
 * y respeta los demás; un valor vacío o nulo quita el parámetro. Por omisión crea una entrada del historial (abrir una ventana);
 * para lo que se escribe mientras se teclea (filtros) o para cerrar, usar `replace`.
 *
 * Varias llamadas a `set` en el mismo evento se componen (la segunda parte de lo que dejó la primera), a diferencia de la forma
 * funcional de `setSearchParams`, que parte siempre de lo último dibujado.
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  }, [params]);

  const get = useCallback((key: string) => params.get(key) ?? '', [params]);

  const set = useCallback(
    (patch: Patch, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(latest.current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      }
      latest.current = next;
      setParams(next, { replace: options?.replace ?? false });
    },
    [setParams],
  );

  return { get, set };
}
