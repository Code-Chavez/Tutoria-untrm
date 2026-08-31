import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimer } from './useIdleTimer';

describe('useIdleTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el aviso tras el tiempo de inactividad', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ idleMs: 1000, warningMs: 500, onExpire }),
    );

    expect(result.current.isWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isWarning).toBe(true);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('llama a onExpire cuando el aviso se agota', () => {
    const onExpire = vi.fn();
    renderHook(() => useIdleTimer({ idleMs: 1000, warningMs: 500, onExpire }));

    act(() => {
      vi.advanceTimersByTime(1000 + 500);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('stayActive cancela el aviso y evita el cierre', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ idleMs: 1000, warningMs: 500, onExpire }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isWarning).toBe(true);

    act(() => {
      result.current.stayActive();
    });
    expect(result.current.isWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('la actividad del usuario reinicia el conteo de inactividad', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimer({ idleMs: 1000, warningMs: 500, onExpire }),
    );

    act(() => {
      vi.advanceTimersByTime(900);
    });
    // Actividad justo antes de expirar: rearma el conteo.
    act(() => {
      window.dispatchEvent(new Event('mousedown'));
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(result.current.isWarning).toBe(false);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
