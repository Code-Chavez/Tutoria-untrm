import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuditLogPage } from './AuditLogPage';
import { auditService, type AuditEntry } from '../services/auditService';

vi.mock('../services/auditService', async () => {
  const actual = await vi.importActual<typeof import('../services/auditService')>('../services/auditService');
  return { ...actual, auditService: { list: vi.fn(), options: vi.fn() } };
});
const mocked = vi.mocked(auditService);

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'e1',
  createdAt: '2026-10-08T15:30:00.000Z',
  action: 'UPDATE',
  entity: 'User',
  entityId: 'a1b2c3d4-0000-0000-0000-000000000000',
  details: 'isActive',
  ipAddress: '10.0.0.5',
  actorName: 'Administrador SIT',
  actorEmail: 'admin@untrm.edu.pe',
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <AuditLogPage />
    </QueryClientTestWrapper>,
  );

describe('AuditLogPage (UI-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.options.mockResolvedValue({ entities: ['User', 'School'], actions: ['LOGIN', 'UPDATE'] });
    mocked.list.mockResolvedValue({ items: [entry()], total: 1, page: 1, pageSize: 25 });
  });

  it('muestra autor, fecha, acción, entidad, campos modificados e IP', async () => {
    renderPage();
    expect(await screen.findByText('Administrador SIT')).toBeInTheDocument();
    expect(screen.getByText('admin@untrm.edu.pe')).toBeInTheDocument();
    const row = within(screen.getByRole('table'));
    expect(row.getByText('Modificación')).toBeInTheDocument();
    expect(row.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('Campos: isActive')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
  });

  it('al filtrar vuelve a la primera página y consulta con esos filtros', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Administrador SIT');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Inicio de sesión' })).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Filtrar por acción'), 'LOGIN');

    await waitFor(() =>
      expect(mocked.list).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'LOGIN', page: 1, pageSize: 25 })),
    );
  });

  it('distingue «sin registros» de «sin resultados para esos filtros»', async () => {
    mocked.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Aún no hay registros')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Usuario' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Filtrar por entidad'), 'User');
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });

  it('un error de la API se informa con opción de reintentar', async () => {
    mocked.list.mockRejectedValue(new Error('x'));
    renderPage();
    expect(await screen.findByText('No se pudo cargar la bitácora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
