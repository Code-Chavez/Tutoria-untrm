import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { UserAccessDialog } from './UserAccessDialog';
import { describeScope } from '../accessScope';
import { userService, type User, type UserAccess } from '../services/userService';
import type { Role } from '../services/roleService';

vi.mock('../services/userService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/userService')>();
  return { ...actual, userService: { ...actual.userService, getAccess: vi.fn(), setAccess: vi.fn() } };
});
let currentUserId = 'admin';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: currentUserId } }) }));
const mocked = vi.mocked(userService);

const user = { id: 'u1', email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', isActive: true } as User;
const role = { id: 'r1', name: 'Coordinador', description: '', permissions: [{ code: 'students:read', description: 'Ver tutorados' }, { code: 'reports:read', description: 'Ver informes' }] } as Role;
const schools = [{ id: 's1', name: 'Sistemas', facultyId: 'f1', isActive: true }, { id: 's2', name: 'Mecánica', facultyId: 'f1', isActive: true }];
const faculties = [{ id: 'f1', name: 'Ingeniería' }];
const access = (over: Partial<UserAccess> = {}): UserAccess => ({ userId: 'u1', role: { id: 'r1', name: 'Coordinador' }, policy: null, source: 'DEFAULT', configurable: true, ...over });

const renderDialog = (onClose = vi.fn()) =>
  render(
    <QueryClientTestWrapper>
      <UserAccessDialog user={user} role={role} schools={schools as never} faculties={faculties} onClose={onClose} />
    </QueryClientTestWrapper>,
  );

describe('UserAccessDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserId = 'admin';
    mocked.getAccess.mockResolvedValue(access());
  });

  it('resume lo que puede hacer (permisos del rol, por área) y avisa que rige el valor por defecto', async () => {
    renderDialog();
    expect(await screen.findByText(/Sin alcance definido/)).toBeInTheDocument();
    expect(screen.getByText(/Ver tutorados/)).toBeInTheDocument();
    expect(screen.getByText(/Ver informes/)).toBeInTheDocument();
    // Lo que muestra el selector no es lo vigente: no hay nada que guardar hasta que se elija un alcance.
    expect(screen.getByText(/Elija un alcance para definirlo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar alcance' })).toBeDisabled();
  });

  it('define un alcance por escuelas: exige elegir al menos una y envía las elegidas', async () => {
    mocked.setAccess.mockResolvedValue(access({ source: 'STORED', policy: { kind: 'SCHOOLS', schoolIds: ['s2'], facultyIds: [], service: null, revision: 0 } }));
    const u = userEvent.setup();
    renderDialog();
    await u.selectOptions(await screen.findByLabelText('Alcance'), 'SCHOOLS');
    expect(screen.getByRole('button', { name: 'Guardar alcance' })).toBeDisabled();
    expect(screen.getByText(/Elija al menos una escuela/)).toBeInTheDocument();

    await u.click(screen.getByLabelText(/Mecánica/));
    expect(screen.getByText(/Ve a los tutorados de: Mecánica\./)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Guardar alcance' }));

    expect(mocked.setAccess).toHaveBeenCalledWith('u1', { kind: 'SCHOOLS', schoolIds: ['s2'], facultyIds: undefined, service: undefined });
    expect(await screen.findByRole('status')).toHaveTextContent('Alcance guardado.');
  });

  it('muestra el motivo del servidor cuando rechaza el alcance', async () => {
    mocked.setAccess.mockRejectedValue(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status: 400, statusText: 'Bad', data: { error: 'Elija al menos una escuela para el alcance por escuela.' }, headers: {}, config: {} as never }));
    const u = userEvent.setup();
    renderDialog();
    await u.selectOptions(await screen.findByLabelText('Alcance'), 'INSTITUTION');
    await u.click(screen.getByRole('button', { name: 'Guardar alcance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elija al menos una escuela');
  });

  it('tras cambiar de rol (alcance «ninguno») lo advierte', async () => {
    mocked.getAccess.mockResolvedValue(access({ source: 'STORED', policy: { kind: 'NONE', schoolIds: [], facultyIds: [], service: null, revision: 3 } }));
    renderDialog();
    expect(await screen.findByText(/no verá datos de tutorados hasta que lo defina/)).toBeInTheDocument();
  });

  it('no deja editar el propio alcance, ni el del estudiante, ni el de la administración', async () => {
    currentUserId = 'u1';
    const first = renderDialog();
    expect(await screen.findByLabelText('Alcance')).toBeDisabled();
    expect(screen.getByText(/No puede cambiar su propio alcance/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar alcance' })).not.toBeInTheDocument();
    first.unmount();

    currentUserId = 'admin';
    mocked.getAccess.mockResolvedValue(access({ role: { id: 'r9', name: 'Tutorado' }, configurable: false }));
    const second = renderDialog();
    expect(await screen.findByText(/no se amplía/)).toBeInTheDocument();
    expect(screen.getByLabelText('Alcance')).toBeDisabled();
    second.unmount();

    mocked.getAccess.mockResolvedValue(access({ role: { id: 'r8', name: 'Administrador DBU' } }));
    renderDialog();
    expect(await screen.findByText(/conserva el alcance de toda la institución/)).toBeInTheDocument();
    expect(screen.getByLabelText('Alcance')).toBeDisabled();
  });

  it('si no carga, lo dice', async () => {
    mocked.getAccess.mockRejectedValue(new Error('x'));
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el alcance');
  });
});

describe('describeScope', () => {
  const base = { kind: 'NONE' as const, schoolIds: [], facultyIds: [], service: '' };
  it('dice hasta dónde llega cada tipo de alcance', () => {
    expect(describeScope(base, [], [])).toBe('No ve datos de tutorados.');
    expect(describeScope({ ...base, kind: 'OWN' }, [], [])).toMatch(/asignados/);
    expect(describeScope({ ...base, kind: 'INSTITUTION' }, [], [])).toMatch(/toda la institución/);
    expect(describeScope({ ...base, kind: 'FACULTIES', facultyIds: ['f1'] }, [], faculties)).toBe('Ve a los tutorados de todas las escuelas de: Ingeniería.');
    expect(describeScope({ ...base, kind: 'SERVICE', service: 'SALUD' }, [], [])).toMatch(/Salud.*no ve expedientes individuales/);
  });
});
