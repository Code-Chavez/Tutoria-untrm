import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { PeriodClosurePage } from './PeriodClosurePage';
import { periodService, type PeriodClosure } from '../services/periodService';
import { catalogService } from '@features/catalogos/services/catalogService';

vi.mock('../services/periodService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/periodService')>();
  return { ...actual, periodService: { current: vi.fn(), closure: vi.fn(), close: vi.fn(), reopen: vi.fn() } };
});
vi.mock('@features/catalogos/services/catalogService', () => ({ catalogService: { list: vi.fn() } }));

const mocked = vi.mocked(periodService);
const catalog = vi.mocked(catalogService);

const summary = {
  students: { total: 70, active: 68, atRisk: 4 },
  tutors: 5,
  sessions: { total: 120, individual: 90, group: 30, cancelled: 8, withAttendance: 80 },
  referrals: { total: 9, open: 2 },
  tutoringRequests: { total: 14, open: 3 },
  evaluations: { responses: 41 },
  semesterReports: { submitted: 5 },
  pending: { openRequests: 3, openReferrals: 2, upcomingSessions: 1 },
};

const closure = (over: Partial<PeriodClosure> = {}): PeriodClosure => ({
  period: { id: 'p1', name: '2026-II', startDate: '2026-08-24T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z' },
  state: 'VIGENTE',
  closedAt: null,
  summary,
  isPreview: true,
  ...over,
});

const entry = (id: string, name: string, isActive: boolean, startDate: string | null = null) => ({ id, kind: 'periods' as const, name, isActive, code: null, facultyId: null, startDate, endDate: null, usage: 0 });

const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientTestWrapper>
        <PeriodClosurePage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

const confirmButton = () => {
  const dialog = screen.getByRole('dialog');
  return Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Cerrar periodo') as HTMLButtonElement;
};

describe('PeriodClosurePage (fase 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.list.mockResolvedValue([entry('p1', '2026-II', true), entry('p0', '2026-I', false)]);
    mocked.closure.mockResolvedValue(closure());
  });

  it('muestra por defecto el periodo vigente con su vista previa y lo que quedará pendiente', async () => {
    renderPage();

    expect(await screen.findByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText(/Vista previa calculada ahora/)).toBeInTheDocument();
    expect(screen.getByText(/70 \(68 activos, 4 en riesgo académico\)/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/3 solicitudes abiertas, 2 derivaciones abiertas y 1 sesiones próximas/);
    expect(mocked.closure).toHaveBeenCalledWith('p1');
  });

  it('sin periodo vigente propone el más reciente (el que se cerró último), no el primero de la lista', async () => {
    catalog.list.mockResolvedValue([entry('p0', '2026-I', false, '2026-03-01T00:00:00.000Z'), entry('p1', '2026-II', false, '2026-08-24T00:00:00.000Z')]);
    renderPage();

    await waitFor(() => expect(mocked.closure).toHaveBeenCalledWith('p1'));
    expect(mocked.closure).not.toHaveBeenCalledWith('p0');
  });

  it('para cerrar hay que escribir el nombre exacto del periodo; recién entonces se habilita', async () => {
    mocked.close.mockResolvedValue(closure({ state: 'CERRADO', isPreview: false, closedAt: '2026-12-20T00:00:00.000Z' }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Vigente');

    await user.click(screen.getByRole('button', { name: 'Cerrar periodo' }));
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText('Nombre del periodo'), '2026-I');
    expect(confirmButton()).toBeDisabled();

    await user.clear(screen.getByLabelText('Nombre del periodo'));
    await user.type(screen.getByLabelText('Nombre del periodo'), '2026-II');
    expect(confirmButton()).toBeEnabled();
    await user.click(confirmButton());

    await waitFor(() => expect(mocked.close).toHaveBeenCalledWith('p1', '2026-II'));
  });

  it('un periodo cerrado muestra su resumen guardado y permite reabrirlo si no hay otro vigente', async () => {
    catalog.list.mockResolvedValue([entry('p1', '2026-II', false)]);
    mocked.closure.mockResolvedValue(closure({ state: 'CERRADO', isPreview: false, closedAt: '2026-12-20T00:00:00.000Z' }));
    mocked.reopen.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Cerrado')).toBeInTheDocument();
    expect(screen.getByText(/Resumen guardado al momento del cierre/)).toBeInTheDocument();
    expect(screen.queryByText(/Vista previa/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reabrir periodo' }));
    await user.click(screen.getByRole('button', { name: 'Reabrir' }));

    await waitFor(() => expect(mocked.reopen).toHaveBeenCalledWith('p1'));
  });

  it('no deja reabrir un periodo cerrado mientras otro está vigente', async () => {
    const closed = closure({
      period: { id: 'p0', name: '2026-I', startDate: '2026-03-01T00:00:00.000Z', endDate: '2026-07-01T00:00:00.000Z' },
      state: 'CERRADO',
      isPreview: false,
      closedAt: '2026-07-02T00:00:00.000Z',
    });
    mocked.closure.mockImplementation(async (id: string) => (id === 'p0' ? closed : closure()));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Vigente');
    await user.selectOptions(screen.getByLabelText('Periodo'), 'p0');

    expect(await screen.findByRole('button', { name: 'Reabrir periodo' })).toBeDisabled();
    expect(screen.getByText(/Hay otro periodo vigente/)).toBeInTheDocument();
  });

  it('muestra el motivo si el servidor rechaza el cierre', async () => {
    mocked.close.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'Solo se puede cerrar el periodo vigente' } } }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Vigente');

    await user.click(screen.getByRole('button', { name: 'Cerrar periodo' }));
    await user.type(screen.getByLabelText('Nombre del periodo'), '2026-II');
    await user.click(confirmButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo se puede cerrar el periodo vigente');
  });
});
