import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// El router se simula: lo que `useSearchParams` devuelve es lo último que el router DIBUJÓ, y `setParams` solo registra lo pedido. Así se
// controla el orden en que llegan los dibujados, que es justo lo que importa (en el navegador, el dibujado de un cambio puede confirmarse
// después de que la persona ya pidió el siguiente).
let drawn = new URLSearchParams();
const setParams = vi.fn();
vi.mock('react-router-dom', () => ({ useSearchParams: () => [drawn, setParams] }));

import { useUrlParams } from './useUrlParams';

const lastRequested = () => (setParams.mock.calls.at(-1)?.[0] as URLSearchParams).toString();

describe('useUrlParams', () => {
  beforeEach(() => {
    drawn = new URLSearchParams();
    setParams.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('lee un parámetro, o cadena vacía si no está', () => {
    drawn = new URLSearchParams('q=abc');
    const { result } = renderHook(() => useUrlParams());
    expect(result.current.get('q')).toBe('abc');
    expect(result.current.get('estado')).toBe('');
  });

  it('cambia solo lo indicado, respeta lo demás y un valor vacío o nulo quita el parámetro', () => {
    drawn = new URLSearchParams('q=abc&estado=x');
    const { result } = renderHook(() => useUrlParams());
    act(() => result.current.set({ q: '', escuela: 'e1' }, { replace: true }));
    expect(lastRequested()).toBe('estado=x&escuela=e1');
    expect(setParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), { replace: true });
    act(() => result.current.set({ estado: null }));
    expect(setParams).toHaveBeenLastCalledWith(expect.any(URLSearchParams), { replace: false });
  });

  it('varias llamadas en el mismo evento se componen', () => {
    const { result } = renderHook(() => useUrlParams());
    act(() => {
      result.current.set({ q: 'abc' });
      result.current.set({ escuela: 'e1' });
    });
    expect(lastRequested()).toBe('q=abc&escuela=e1');
  });

  it('un dibujado viejo que llega entre dos cambios no hace perder el cambio intermedio (issue #255)', () => {
    const { result, rerender } = renderHook(() => useUrlParams());
    // 1. y 2.: la persona escribe y elige una escuela, antes de que el router dibuje nada
    act(() => {
      result.current.set({ q: 'abc' });
      result.current.set({ escuela: 'e1' });
    });
    // El router termina de dibujar el PRIMER cambio (q) cuando ya se pidió el segundo
    drawn = new URLSearchParams('q=abc');
    rerender();
    // 3.: la persona elige un estado; debe partir de lo último pedido (q + escuela), no de lo último dibujado (solo q)
    act(() => result.current.set({ tramite: 'INICIADO' }));
    expect(lastRequested()).toBe('q=abc&escuela=e1&tramite=INICIADO');
  });

  it('cuando el router dibuja el último cambio pedido, vuelve a partir de lo dibujado', () => {
    const { result, rerender } = renderHook(() => useUrlParams());
    act(() => {
      result.current.set({ q: 'abc' });
      result.current.set({ escuela: 'e1' });
    });
    drawn = new URLSearchParams('q=abc&escuela=e1');
    rerender();
    act(() => result.current.set({ tramite: 'INICIADO' }));
    expect(lastRequested()).toBe('q=abc&escuela=e1&tramite=INICIADO');
    drawn = new URLSearchParams('q=abc&escuela=e1&tramite=INICIADO');
    rerender();
    act(() => result.current.set({ q: null }));
    expect(lastRequested()).toBe('escuela=e1&tramite=INICIADO');
  });

  it('una navegación externa (Atrás, un enlace) cuando no hay nada pendiente actualiza la base', () => {
    drawn = new URLSearchParams('q=abc');
    const { result, rerender } = renderHook(() => useUrlParams());
    drawn = new URLSearchParams('q=otro&estado=y');
    rerender();
    act(() => result.current.set({ escuela: 'e1' }));
    expect(lastRequested()).toBe('q=otro&estado=y&escuela=e1');
  });

  it('un cambio que no modifica la URL no deja nada pendiente que oculte la navegación siguiente', () => {
    drawn = new URLSearchParams('a=1');
    const { result, rerender } = renderHook(() => useUrlParams());
    act(() => result.current.set({ a: '1' }));
    drawn = new URLSearchParams('a=2');
    rerender();
    act(() => result.current.set({ b: '1' }));
    expect(lastRequested()).toBe('a=2&b=1');
  });

  it('un cambio que el router nunca dibuja (lo reemplazó otra navegación) no bloquea la base para siempre', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
    const { result, rerender } = renderHook(() => useUrlParams());
    act(() => result.current.set({ q: 'perdido' }));
    vi.setSystemTime(new Date('2026-11-08T10:00:05Z'));
    drawn = new URLSearchParams('z=1');
    rerender();
    act(() => result.current.set({ b: '1' }));
    expect(lastRequested()).toBe('z=1&b=1');
  });
});
