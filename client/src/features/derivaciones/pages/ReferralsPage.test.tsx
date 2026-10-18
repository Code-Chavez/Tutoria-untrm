import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { ReferralsPage } from './ReferralsPage';
import { referralService, type StudentReferral } from '../services/referralService';

vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'Docente Tutor' } }) }));
vi.mock('@features/firmados/hooks/useSignedDocuments', () => ({
  useReferralSignedDocuments: () => ({ documents: [], loading: false, attach: vi.fn() }),
}));
vi.mock('../services/referralService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/referralService')>();
  return { ...actual, referralService: { getReferrals: vi.fn(), downloadConstancia: vi.fn(), updateStatus: vi.fn() } };
});
const mocked = vi.mocked(referralService);

const referral: StudentReferral = {
  id: 'ref-1',
  studentId: 'stud-123456789',
  referredById: 'tutor-1',
  checkedAspects: [],
  reason: 'Ansiedad antes de los exámenes',
  service: 'PSICOLOGIA',
  receivingInstance: null,
  status: 'ENVIADO',
  createdAt: '2026-10-01T10:00:00.000Z',
  statusHistory: [],
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <QueryClientTestWrapper>
        <ReferralsPage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('ReferralsPage: avisos con caso concreto (R03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getReferrals.mockResolvedValue([referral]);
  });

  it('con ?caso=<id> abre el detalle de ese caso', async () => {
    renderAt('/derivaciones?caso=ref-1');
    expect(await screen.findByRole('dialog', { name: 'Detalle de derivación' })).toBeInTheDocument();
    expect(screen.getByText('Ansiedad antes de los exámenes')).toBeInTheDocument();
  });

  it('si el caso ya no está disponible para la cuenta, lo explica en vez de quedar en silencio', async () => {
    renderAt('/derivaciones?caso=ya-no-existe');
    expect(await screen.findByRole('status')).toHaveTextContent('ya no está disponible para tu cuenta');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('sin parámetro no abre nada ni muestra avisos', async () => {
    renderAt('/derivaciones');
    await screen.findByText(/ANSIEDAD|Enviado|Enviada/i).catch(() => undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

// El caso real de la revisión: un solo caso por recibir entre seis cerrados que aparecían primero (U09)
describe('ReferralsPage: lo pendiente primero y a la vista (U09)', () => {
  const ref = (id: string, status: StudentReferral['status'], day: number, over: Partial<StudentReferral> = {}): StudentReferral => ({
    ...referral,
    id,
    status,
    createdAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    studentName: `Caso ${id}`,
    studentCode: `2019000${day}`,
    ...over,
  });
  const MANY = [
    ref('c1', 'CERRADO', 1), ref('c2', 'CERRADO', 2), ref('c3', 'CERRADO', 3),
    ref('a1', 'ATENDIDO', 4), ref('t1', 'EN_ATENCION', 5), ref('n1', 'ENVIADO', 6), ref('r1', 'RECIBIDO', 7),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getReferrals.mockResolvedValue(MANY);
  });

  const names = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[2].textContent);

  it('abre en «Pendientes»: primero lo que falta por recibir, sin los cerrados ni los atendidos', async () => {
    renderAt('/derivaciones');
    await screen.findByText('Caso n1');
    expect(names()).toEqual(['Caso n120190006', 'Caso r120190007', 'Caso t120190005']);
    expect(screen.getByRole('button', { name: /Pendientes/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('«Por recibir: 1» del inicio abre solo ese caso, y el contador de la bandeja coincide', async () => {
    renderAt('/derivaciones?estado=por-recibir');
    await screen.findByText('Caso n1');
    expect(names()).toEqual(['Caso n120190006']);
    expect(screen.getByRole('button', { name: 'Por recibir 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cada contador del inicio tiene su vista: en trámite, atendidos, cerrados y abiertas', async () => {
    const view = async (estado: string) => {
      const r = renderAt(`/derivaciones?estado=${estado}`);
      await screen.findAllByRole('row');
      const result = names();
      r.unmount();
      return result;
    };
    expect(await view('en-tramite')).toEqual(['Caso r120190007', 'Caso t120190005']);
    expect(await view('atendidos')).toEqual(['Caso a120190004']);
    expect(await view('cerrados')).toEqual(['Caso c320190003', 'Caso c220190002', 'Caso c120190001']);
    expect(await view('abiertas')).toHaveLength(4);
  });

  it('se cambia de vista con los botones, quitando el filtro se ven todos y los cerrados quedan al final', async () => {
    const user = userEvent.setup();
    renderAt('/derivaciones');
    await screen.findByText('Caso n1');
    await user.click(screen.getByRole('button', { name: /Todos/ }));
    expect(names()).toHaveLength(7);
    expect(names().at(-1)).toBe('Caso c120190001');
  });

  it('busca por estudiante, código o servicio, y avisa si nada coincide', async () => {
    const user = userEvent.setup();
    renderAt('/derivaciones?estado=todos');
    await screen.findByText('Caso n1');
    await user.type(screen.getByLabelText('Buscar derivación'), '20190006');
    expect(names()).toEqual(['Caso n120190006']);
    await user.clear(screen.getByLabelText('Buscar derivación'));
    await user.type(screen.getByLabelText('Buscar derivación'), 'zzzz');
    expect(await screen.findByText('Ninguna derivación coincide con la búsqueda')).toBeInTheDocument();
  });

  it('si no hay pendientes lo dice y ofrece ver todos; un caso de un aviso abre aunque esté cerrado y fuera de la vista', async () => {
    mocked.getReferrals.mockResolvedValue([ref('c1', 'CERRADO', 1)]);
    const user = userEvent.setup();
    const first = renderAt('/derivaciones');
    expect(await screen.findByText('No hay derivaciones pendientes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(await screen.findByText('Caso c1')).toBeInTheDocument();
    first.unmount();

    renderAt('/derivaciones?caso=c1');
    expect(await screen.findByRole('dialog', { name: 'Detalle de derivación' })).toBeInTheDocument();
  });

  it('los casos que esperan dicen desde cuándo', async () => {
    renderAt('/derivaciones');
    await screen.findByText('Caso n1');
    expect(screen.getAllByText(/Espera desde hace \d+ días?|Espera desde hoy/).length).toBe(3);
  });
});
