import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
