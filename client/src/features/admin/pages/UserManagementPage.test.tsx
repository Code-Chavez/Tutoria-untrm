import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { UserManagementPage } from './UserManagementPage';
import { userService, type User } from '../services/userService';

vi.mock('../services/userService', () => ({ userService: { getUsers: vi.fn(), toggleUserStatus: vi.fn(), getEmailPolicy: vi.fn() } }));
vi.mock('../services/roleService', () => ({ roleService: { getRoles: vi.fn().mockResolvedValue([{ id: 'r1', name: 'Administrador DBU' }]) } }));
vi.mock('@features/catalogos/services/catalogService', () => ({ catalogService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn().mockResolvedValue([]) } }));
const mocked = vi.mocked(userService);

const MESSAGE = 'No se puede desactivar ni cambiar de rol a la última cuenta de administración activa. Active o asigne primero a otro administrador y vuelva a intentarlo.';
const admin: User = { id: 'u1', email: 'admin@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', isActive: true };

// Un 409 del servidor, con la forma que devuelve axios.
const conflict = () => new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, statusText: 'Conflict', data: { error: MESSAGE }, headers: {}, config: {} as never });

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>
    </QueryClientTestWrapper>,
  );

describe('UserManagementPage: desactivar a la última cuenta de administración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getUsers.mockResolvedValue([admin]);
  });

  it('ante el 409 muestra el mensaje del servidor y la cuenta sigue activa', async () => {
    mocked.toggleUserStatus.mockRejectedValue(conflict());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE);
    expect(mocked.toggleUserStatus).toHaveBeenCalledWith('u1');
    // El estado anterior se conserva: sigue activa, no se recargó la lista y el diálogo se cerró.
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
    expect(mocked.getUsers).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('si la operación se acepta, no hay mensaje de error y se recarga la lista', async () => {
    mocked.toggleUserStatus.mockResolvedValue({ ...admin, isActive: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));

    await vi.waitFor(() => expect(mocked.getUsers.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
