import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingPage } from './PendingPage';
import { pendingService, type PendingItem } from '../services/pendingService';

vi.mock('../services/pendingService', () => ({ pendingService: { list: vi.fn() } }));
const mocked = vi.mocked(pendingService);

const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const item = (over: Partial<PendingItem>): PendingItem => ({
  kind: 'DESIGNATION_REJECTED',
  schoolId: 'sys',
  schoolName: 'Ingeniería de Sistemas',
  cycle: 3,
  title: 'Elena Ramírez rechazó la tutoría del ciclo 3 de Ingeniería de Sistemas',
  detail: 'Motivo: Licencia por salud',
  since: day(5),
  link: '/asignacion',
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PendingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PendingPage (pendientes institucionales)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin pendientes lo dice con claridad', async () => {
    mocked.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay pendientes')).toBeInTheDocument();
  });

  it('muestra qué pasó, dónde, desde cuándo y a dónde ir a resolverlo', async () => {
    mocked.list.mockResolvedValue([
      item({}),
      item({ kind: 'CANCELLED_SESSION_NO_FOLLOWUP', cycle: 3, title: 'Se canceló la cita de la solicitud de Ana Torres', detail: 'Motivo de la cancelación: Paro.', since: day(1), link: '/solicitudes?solicitud=r1' }),
    ]);
    renderPage();
    expect(await screen.findByText(/rechazó la tutoría del ciclo 3/)).toBeInTheDocument();
    expect(screen.getByText('Motivo: Licencia por salud')).toBeInTheDocument();
    expect(screen.getByText(/Ingeniería de Sistemas · ciclo 3 · desde hace 5 días/)).toBeInTheDocument();
    expect(screen.getByText(/desde hace 1 día/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a «Asignación por ciclo»' })).toHaveAttribute('href', '/asignacion');
    expect(screen.getByRole('link', { name: 'Abrir la solicitud' })).toHaveAttribute('href', '/solicitudes?solicitud=r1');
  });

  it('se puede filtrar por tipo y los conteos salen de lo que hay', async () => {
    mocked.list.mockResolvedValue([item({}), item({ kind: 'CYCLE_WITHOUT_TUTOR', title: 'Ciclo 5: 12 estudiantes sin tutor', detail: 'x', cycle: 5 })]);
    const user = userEvent.setup();
    renderPage();
    const select = await screen.findByLabelText('Tipo de pendiente');
    expect(screen.getByRole('option', { name: 'Todos (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ciclo sin tutor (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Cita cancelada/ })).not.toBeInTheDocument(); // no hay de ese tipo

    await user.selectOptions(select, 'CYCLE_WITHOUT_TUTOR');
    expect(screen.getByText('Ciclo 5: 12 estudiantes sin tutor')).toBeInTheDocument();
    expect(screen.queryByText(/rechazó la tutoría/)).not.toBeInTheDocument();
  });

  it('si no se pueden cargar lo dice (no queda una pantalla vacía que parezca «sin pendientes»)', async () => {
    mocked.list.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('No se pudieron cargar los pendientes')).toBeInTheDocument();
    expect(screen.queryByText('No hay pendientes')).not.toBeInTheDocument();
  });
});
