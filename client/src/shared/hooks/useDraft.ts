import { useCallback, useEffect, useState } from 'react';
import { readDraft, removeDraft, writeDraft } from '@shared/utils/drafts';

/**
 * Un valor de formulario que sobrevive a cambiar de pantalla, recargar o una interrupción (ver `shared/utils/drafts`). Si al abrir
 * había un borrador, `restored` es true para avisarlo y poder descartarlo. `isEmpty` dice cuándo el valor no vale la pena guardar.
 */
export function useDraft<T>(userId: string | undefined, key: string, initial: T, isEmpty: (value: T) => boolean) {
  const [state, setState] = useState<{ value: T; restored: boolean }>(() => {
    const saved = userId ? readDraft<T>(userId, key) : null;
    return saved !== null && !isEmpty(saved) ? { value: saved, restored: true } : { value: initial, restored: false };
  });

  useEffect(() => {
    if (!userId) return;
    if (isEmpty(state.value)) removeDraft(userId, key);
    else writeDraft(userId, key, state.value);
  }, [userId, key, state.value, isEmpty]);

  const setValue = useCallback((next: T | ((current: T) => T)) => {
    setState((current) => ({ restored: current.restored, value: typeof next === 'function' ? (next as (c: T) => T)(current.value) : next }));
  }, []);

  /** Descarta el borrador y vuelve al valor inicial (también tras enviar con éxito). */
  const discard = useCallback(() => {
    if (userId) removeDraft(userId, key);
    setState({ value: initial, restored: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  return { value: state.value, setValue, restored: state.restored, discard };
}
