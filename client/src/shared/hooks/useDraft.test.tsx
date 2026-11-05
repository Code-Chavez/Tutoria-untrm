import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDraft } from './useDraft';
import { readDraft, writeDraft } from '@shared/utils/drafts';

const isEmpty = (v: string) => v.trim() === '';

describe('useDraft (U07)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('guarda lo que se escribe y lo recupera al volver, avisando que se recuperó', () => {
    const first = renderHook(() => useDraft<string>('u1', 'k', '', isEmpty));
    expect(first.result.current.restored).toBe(false);
    act(() => first.result.current.setValue('Necesito apoyo'));
    expect(readDraft('u1', 'k')).toBe('Necesito apoyo');
    first.unmount();

    const again = renderHook(() => useDraft<string>('u1', 'k', '', isEmpty));
    expect(again.result.current.value).toBe('Necesito apoyo');
    expect(again.result.current.restored).toBe(true);
  });

  it('no guarda un valor vacío (y quita el borrador si se vacía)', () => {
    const { result } = renderHook(() => useDraft<string>('u1', 'k', '', isEmpty));
    act(() => result.current.setValue('algo'));
    expect(readDraft('u1', 'k')).toBe('algo');
    act(() => result.current.setValue('   '));
    expect(readDraft('u1', 'k')).toBeNull();
  });

  it('descartar vuelve al valor inicial y borra el borrador', () => {
    writeDraft('u1', 'k', 'viejo');
    const { result } = renderHook(() => useDraft<string>('u1', 'k', '', isEmpty));
    expect(result.current.restored).toBe(true);
    act(() => result.current.discard());
    expect(result.current.value).toBe('');
    expect(result.current.restored).toBe(false);
    expect(readDraft('u1', 'k')).toBeNull();
  });

  it('el borrador es de una persona: otra cuenta no lo ve', () => {
    writeDraft('u1', 'k', 'de la primera');
    const { result } = renderHook(() => useDraft<string>('u2', 'k', '', isEmpty));
    expect(result.current.value).toBe('');
    expect(result.current.restored).toBe(false);
  });

  it('sin persona identificada no guarda nada', () => {
    const { result } = renderHook(() => useDraft<string>(undefined, 'k', '', isEmpty));
    act(() => result.current.setValue('algo'));
    expect(window.sessionStorage.length).toBe(0);
  });
});
