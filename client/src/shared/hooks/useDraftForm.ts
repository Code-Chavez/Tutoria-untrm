import { useCallback, useState } from 'react';
import { useDraft } from './useDraft';

/**
 * Un formulario de campos sueltos que se conserva como borrador de la pestaña (ver `useDraft`). `initial` es el valor con el que se
 * abre el formulario; mientras no difiera de él no hay nada que guardar. `set` cambia solo los campos indicados.
 */
export function useDraftForm<T extends object>(userId: string | undefined, key: string, initial: T) {
  const [start] = useState(initial);
  const unchanged = useCallback((value: T) => JSON.stringify(value) === JSON.stringify(start), [start]);
  const { value: form, setValue, restored, discard } = useDraft(userId, key, start, unchanged);
  const set = useCallback((patch: Partial<T>) => setValue((current) => ({ ...current, ...patch })), [setValue]);
  return { form, set, restored, discard };
}
