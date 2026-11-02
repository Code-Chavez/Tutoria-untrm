import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { RolesPage } from './RolesPage';
import { roleService, type Role } from '../services/roleService';

vi.mock('../services/roleService', () => ({
  roleService: { getRoles: vi.fn(), getPermissionCatalog: vi.fn(), create: vi.fn(), update: vi.fn(), setActive: vi.fn() },
}));
const mocked = vi.mocked(roleService);

const perm = (code: string, description: string) => ({ code, description });
const CATALOG = [perm('students:read', 'Ver tutorados'), perm('students:write', 'Crear/editar tutorados'), perm('reports:read', 'Ver informes'), perm('admin:system', 'Administración del sistema')];
const adminRole: Role = { id: 'r-admin', name: 'Administrador DBU', description: 'Administra', isBase: true, isActive: true, userCount: 2, permissions: CATALOG };
const custom: Role = { id: 'r-rev', name: 'Revisor', description: 'Solo lectura', isBase: false, isActive: true, userCount: 0, permissions: [CATALOG[0]!] };
const inUse: Role = { id: 'r-uso', name: 'Con cuentas', description: 'En uso', isBase: false, isActive: true, userCount: 3, permissions: [CATALOG[2]!] };

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <RolesPage />
    </QueryClientTestWrapper>,
  );

const pickRole = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await screen.findByText(adminRole.name);
  await user.click(screen.getByRole('button', { name: new RegExp(name) }));
};

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getRoles.mockResolvedValue([adminRole, custom, inUse]);
    mocked.getPermissionCatalog.mockResolvedValue(CATALOG);
  });

  it('lista los roles marcando cuáles son base y cuántas cuentas tiene cada uno', async () => {
    renderPage();
    await screen.findByText('Administrador DBU');
    const base = screen.getByRole('button', { name: /Administrador DBU/ });
    expect(within(base).getByText('Base')).toBeInTheDocument();
    expect(within(base).getByText('2 cuenta(s)')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Revisor/ })).getByText('Personalizado')).toBeInTheDocument();
  });

  it('un rol base se ve completo pero no se edita: casillas bloqueadas y solo se puede copiar', async () => {
    const user = userEvent.setup();
    renderPage();
    await pickRole(user, 'Administrador DBU');

    expect(screen.getByLabelText(/Ver tutorados/)).toBeChecked();
    expect(screen.getByLabelText(/Ver tutorados/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Crear a partir de este rol' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
  });

  it('copiar un rol base crea uno nuevo sin administración del sistema (no se delega)', async () => {
    mocked.create.mockResolvedValue({ ...custom, id: 'nuevo', name: 'Auxiliar' });
    const user = userEvent.setup();
    renderPage();
    await pickRole(user, 'Administrador DBU');
    await user.click(screen.getByRole('button', { name: 'Crear a partir de este rol' }));

    expect(screen.getByLabelText(/Administración del sistema/)).toBeDisabled();
    expect(screen.getByLabelText(/Administración del sistema/)).not.toBeChecked();
    await user.type(screen.getByLabelText('Nombre del rol'), 'Auxiliar');
    await user.click(screen.getByLabelText(/Ver informes/)); // lo quita
    await user.click(screen.getByRole('button', { name: 'Crear rol' }));

    expect(mocked.create).toHaveBeenCalledTimes(1);
    const input = mocked.create.mock.calls[0]![0];
    expect(input.name).toBe('Auxiliar');
    expect([...input.permissions].sort()).toEqual(['students:read', 'students:write']);
    expect(await screen.findByRole('status')).toHaveTextContent('Rol «Auxiliar» creado.');
  });

  it('crear exige un nombre y una descripción', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Administrador DBU');
    await user.click(screen.getByRole('button', { name: 'Nuevo rol' }));
    expect(screen.getByRole('button', { name: 'Crear rol' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nombre del rol'), 'Nuevo');
    await user.type(screen.getByLabelText('Descripción'), 'Para algo');
    expect(screen.getByRole('button', { name: 'Crear rol' })).toBeEnabled();
  });

  it('edita los permisos de un rol personalizado y guarda solo cuando hay cambios', async () => {
    mocked.update.mockResolvedValue(custom);
    const user = userEvent.setup();
    renderPage();
    await pickRole(user, 'Revisor');

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await user.click(screen.getByLabelText(/Ver informes/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(mocked.update).toHaveBeenCalledWith('r-rev', { description: 'Solo lectura', permissions: expect.arrayContaining(['students:read', 'reports:read']) });
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios de «Revisor» guardados');
  });

  it('muestra el mensaje del servidor cuando rechaza un cambio y conserva lo editado', async () => {
    const message = 'No se puede otorgar este permiso.';
    mocked.update.mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403, statusText: 'Forbidden', data: { error: message }, headers: {}, config: {} as never }));
    const user = userEvent.setup();
    renderPage();
    await pickRole(user, 'Revisor');
    await user.click(screen.getByLabelText(/Ver informes/));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText(/Ver informes/)).toBeChecked();
  });

  it('no deja desactivar un rol con cuentas y lo explica; uno sin cuentas se desactiva tras confirmar', async () => {
    mocked.setActive.mockResolvedValue({ ...custom, isActive: false });
    const user = userEvent.setup();
    renderPage();
    await pickRole(user, 'Con cuentas');
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled();
    expect(screen.getByText(/No se puede desactivar mientras 3 cuenta\(s\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Revisor/ }));
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Desactivar' }));

    expect(mocked.setActive).toHaveBeenCalledWith('r-rev', false);
  });
});
