import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { UserManagementPage } from './UserManagementPage';
import { userService, type User } from '../services/userService';

vi.mock('../services/userService', () => ({ userService: { getUsers: vi.fn(), toggleUserStatus: vi.fn(), getEmailPolicy: vi.fn() } }));
vi.mock('../services/roleService', () => ({ roleService: { getRoles: vi.fn().mockResolvedValue([{ id: 'r1', name: 'Administrador DBU' }]) } }));
vi.mock('@features/catalogos/services/catalogService', () => ({ catalogService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
const mocked = vi.mocked(userService);

const MESSAGE = 'No se puede desactivar ni cambiar de rol a la última cuenta de administración activa. Active o asigne primero a otro administrador y vuelva a intentarlo.';
const admin: User = { id: 'u1', email: 'admin@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', isActive: true };

// Un 409 del servidor, con la forma que devuelve axios.
const conflict = () => new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, statusText: 'Conflict', data: { error: MESSAGE }, headers: {}, config: {} as never });

function Where() {
  const { search } = useLocation();
  return <output aria-label="url">{search}</output>;
}

const renderPage = (url = '/users') =>
  render(
    <QueryClientTestWrapper>
      <MemoryRouter initialEntries={[url]}>
        <UserManagementPage />
        <Where />
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

    // Esperar el dato evita que una búsqueda de accesibilidad costosa sobre el esqueleto bloquee el render pendiente.
    await screen.findByText(admin.email);
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE);
    expect(mocked.toggleUserStatus).toHaveBeenCalledWith('u1');
    // El estado anterior se conserva: sigue activa, no se recargó la lista y el diálogo se cerró.
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
    expect(mocked.getUsers).toHaveBeenCalledTimes(1);
    // El diálogo se cierra al quitarse su parámetro de la URL (una transición de la navegación, no un setState inmediato).
    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('si la operación se acepta, no hay mensaje de error y se recarga la lista', async () => {
    mocked.toggleUserStatus.mockResolvedValue({ ...admin, isActive: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(admin.email);
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }));

    await vi.waitFor(() => expect(mocked.getUsers.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('UserManagementPage: el estado de la pantalla vive en la URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocked.getUsers.mockResolvedValue([admin]);
  });

  it('los filtros salen de la URL y escribirlos la actualiza', async () => {
    const user = userEvent.setup();
    renderPage('/users?q=ruiz&estado=active');
    await screen.findByText(admin.email);
    const search = screen.getByRole('searchbox', { name: 'Buscar usuario' });
    expect(search).toHaveValue('ruiz');

    await user.clear(search);
    await user.type(search, 'ana');
    expect(screen.getByLabelText('url')).toHaveTextContent('q=ana');
    expect(screen.getByLabelText('url')).toHaveTextContent('estado=active');
  });

  it('abrir «Editar» pone el usuario en la URL y un enlace con ese parámetro abre la ventana', async () => {
    const user = userEvent.setup();
    const first = renderPage();
    await screen.findByText(admin.email);
    await user.click(screen.getByRole('button', { name: 'Editar usuario' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('editar=u1');
    expect(await screen.findByRole('dialog', { name: 'Editar Usuario' })).toBeInTheDocument();
    first.unmount();

    renderPage('/users?editar=u1');
    expect(await screen.findByRole('dialog', { name: 'Editar Usuario' })).toBeInTheDocument();
  });

  it('cerrar la ventana quita el parámetro; «Nuevo usuario» usa nuevo=1', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(admin.email);
    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('nuevo=1');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('url')).toBeEmptyDOMElement();
  });

  it('un enlace a un usuario que no existe no deja una ventana abierta y limpia el parámetro', async () => {
    renderPage('/users?editar=no-existe&acceso=no-existe&confirmar=no-existe');
    await screen.findByText(admin.email);
    await vi.waitFor(() => expect(screen.getByLabelText('url')).toBeEmptyDOMElement());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un enlace con confirmar=<id> abre la confirmación de desactivar', async () => {
    renderPage('/users?confirmar=u1');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('lo escrito en «Nuevo usuario» se recupera al recargar y se descarta al guardar', async () => {
    const user = userEvent.setup();
    const first = renderPage('/users?nuevo=1');
    await user.type(await screen.findByLabelText('Nombre'), 'Lucía');
    first.unmount();

    renderPage('/users?nuevo=1');
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Lucía');
    expect(screen.getByText(/Recuperamos lo que estabas escribiendo/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });
});
