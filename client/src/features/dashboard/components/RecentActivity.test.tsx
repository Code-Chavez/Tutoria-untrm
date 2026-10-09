import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { RecentActivity } from './RecentActivity';
import { auditService } from '@features/auditoria/services/auditService';

vi.mock('@features/auditoria/services/auditService', async () => {
  const actual = await vi.importActual<typeof import('@features/auditoria/services/auditService')>(
    '@features/auditoria/services/auditService',
  );
  return { ...actual, auditService: { list: vi.fn(), options: vi.fn() } };
});
const mocked = vi.mocked(auditService);

const renderIt = () =>
  render(
    <MemoryRouter>
      <QueryClientTestWrapper>
        <RecentActivity />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('RecentActivity (UI-09)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista movimientos reales con su autor y enlaza a la bitácora', async () => {
    mocked.list.mockResolvedValue({
      items: [
        {
          id: 'e1',
          createdAt: '2026-10-08T15:30:00.000Z',
          action: 'LOGIN',
          entity: 'User',
          entityId: 'u1',
          details: null,
          ipAddress: null,
          actorName: 'Elena Ramírez',
          actorEmail: 'elena@untrm.edu.pe',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 6,
    });
    renderIt();
    expect(await screen.findByText(/Inicio de sesión/)).toBeInTheDocument();
    expect(screen.getByText(/Elena Ramírez/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la bitácora completa' })).toHaveAttribute('href', '/auditoria');
    expect(mocked.list).toHaveBeenCalledWith({ page: 1, pageSize: 6 });
  });

  it('sin movimientos lo dice, sin inventar datos', async () => {
    mocked.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 6 });
    renderIt();
    expect(await screen.findByText('Sin actividad reciente')).toBeInTheDocument();
  });
});
