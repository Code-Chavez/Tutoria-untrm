import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { PeriodStatusBanner } from './PeriodStatusBanner';
import { periodService } from '../services/periodService';

vi.mock('../services/periodService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/periodService')>();
  return { ...actual, periodService: { current: vi.fn() } };
});
const mocked = vi.mocked(periodService);

const renderBanner = () =>
  render(
    <QueryClientTestWrapper>
      <PeriodStatusBanner />
    </QueryClientTestWrapper>,
  );

describe('PeriodStatusBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('avisa del solo lectura cuando no hay un periodo abierto', async () => {
    mocked.current.mockResolvedValue({ open: false, period: null, enrolled: null });
    renderBanner();

    expect(await screen.findByRole('status')).toHaveTextContent(/Tutoría en solo lectura/);
  });

  it('no muestra nada con un periodo abierto', async () => {
    mocked.current.mockResolvedValue({ open: true, period: { id: 'p1', name: '2026-II', startDate: '2026-08-24', endDate: '2026-12-18' }, enrolled: null });
    renderBanner();

    await vi.waitFor(() => expect(mocked.current).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa a un estudiante que no figura en la carga del periodo vigente (solo lectura)', async () => {
    mocked.current.mockResolvedValue({ open: true, period: { id: 'p1', name: '2026-II', startDate: '2026-08-24', endDate: '2026-12-18' }, enrolled: false });
    renderBanner();

    expect(await screen.findByRole('status')).toHaveTextContent(/no figuras en la carga del periodo 2026-II/);
  });

  it('un estudiante matriculado no ve aviso', async () => {
    mocked.current.mockResolvedValue({ open: true, period: { id: 'p1', name: '2026-II', startDate: '2026-08-24', endDate: '2026-12-18' }, enrolled: true });
    renderBanner();

    await vi.waitFor(() => expect(mocked.current).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('no muestra nada si la consulta falla (no inventa un cierre)', async () => {
    mocked.current.mockRejectedValue(new Error('sin red'));
    renderBanner();

    await vi.waitFor(() => expect(mocked.current).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
