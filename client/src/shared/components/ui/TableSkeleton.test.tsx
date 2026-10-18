import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton: la carga se ve y se anuncia (U03)', () => {
  afterEach(() => vi.useRealTimers());

  it('dice qué se carga, de forma visible y accesible, no solo con filas grises', () => {
    render(<TableSkeleton label="Cargando tus sesiones…" />);
    expect(screen.getByText('Cargando tus sesiones…')).toBeVisible();
    const bar = screen.getByRole('progressbar', { name: 'Cargando tus sesiones…' });
    expect(bar).toHaveAttribute('aria-busy', 'true');
  });

  it('sin etiqueta usa «Cargando…»', () => {
    render(<TableSkeleton />);
    expect(screen.getByRole('progressbar', { name: 'Cargando…' })).toBeInTheDocument();
  });

  it('si tarda más de lo normal lo avisa y ofrece reintentar', async () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<TableSkeleton slowAfterMs={5000} onRetry={onRetry} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Está tardando más de lo normal');
    vi.useRealTimers();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin acción de reintento sugiere recargar', () => {
    vi.useFakeTimers();
    render(<TableSkeleton slowAfterMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('recarga la página');
  });
});
