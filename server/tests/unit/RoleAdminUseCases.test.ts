import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@application/use-cases/roles/UpdateRoleUseCase';
import { SetRoleActiveUseCase } from '@application/use-cases/roles/SetRoleActiveUseCase';
import {
  PermissionNotGrantableError,
  RoleAlreadyExistsError,
  RoleInUseError,
  RoleInactiveError,
  RoleNotFoundError,
  RoleProtectedError,
  UnknownPermissionError,
  assertRoleActive,
} from '@application/use-cases/roles/RoleErrors';
import { validateGrantablePermissions } from '@application/use-cases/roles/rolePermissionPolicy';
import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAdminRepository } from '@domain/repositories/RoleAdminRepository';

// LEV-R11 (primera parte): roles configurables con roles base protegidos. Las reglas de negocio se prueban aquí con repositorios
// simulados; la transacción real (rol + bitácora) y las rutas se prueban contra la base en tests/integration/roleAdminHttp.test.ts.
const perm = (code: string) => ({ id: `p-${code}`, code, description: code });
const role = (over: Partial<Role> = {}): Role => ({ id: 'r1', name: 'Revisor', description: 'd', permissions: [perm('reports:read')], createdAt: new Date(), isBase: false, isActive: true, ...over });
const ADMIN_PERMS = ['reports:read', 'students:read', 'users:read', 'admin:system'];

function build(existing: Role | null = role()) {
  const roles: jest.Mocked<RoleRepository> = {
    findById: jest.fn().mockResolvedValue(existing),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    create: jest.fn(),
  };
  const admin: jest.Mocked<RoleAdminRepository> = {
    createWithPermissions: jest.fn().mockImplementation(async (d) => role({ id: 'new', name: d.name, permissions: d.permissionCodes.map(perm) })),
    update: jest.fn().mockImplementation(async () => ({ role: role(), added: [], removed: [] })),
    setActive: jest.fn().mockImplementation(async (_id, active) => role({ isActive: active })),
    countUsers: jest.fn().mockResolvedValue(0),
  };
  const onChanged = jest.fn();
  return { roles, admin, onChanged };
}

describe('validateGrantablePermissions', () => {
  it('quita repetidos, ordena y acepta lo que el que otorga posee', () => {
    expect(validateGrantablePermissions(['students:read', 'reports:read', 'reports:read'], ADMIN_PERMS)).toEqual(['reports:read', 'students:read']);
  });
  it('rechaza códigos que no están en el catálogo', () => {
    expect(() => validateGrantablePermissions(['reports:read', 'inventado:todo'], ADMIN_PERMS)).toThrow(UnknownPermissionError);
  });
  it('rechaza admin:system aunque quien otorga lo tenga (no delegable)', () => {
    expect(() => validateGrantablePermissions(['admin:system'], ADMIN_PERMS)).toThrow(PermissionNotGrantableError);
  });
  it('nadie otorga un permiso que no tiene', () => {
    expect(() => validateGrantablePermissions(['users:read'], ['reports:read'])).toThrow(PermissionNotGrantableError);
  });
});

describe('CreateRoleUseCase con permisos', () => {
  it('crea el rol con los permisos validados y vacía las cachés', async () => {
    const { roles, admin, onChanged } = build();
    const created = await new CreateRoleUseCase(roles, admin, onChanged).execute({ name: ' Revisor 2 ', description: 'd', permissions: ['students:read', 'reports:read'] }, 'a1', '10.0.0.1', ADMIN_PERMS);

    expect(admin.createWithPermissions).toHaveBeenCalledWith({ name: 'Revisor 2', description: 'd', permissionCodes: ['reports:read', 'students:read'] }, { userId: 'a1', ipAddress: '10.0.0.1' });
    expect(created.permissions.map((p) => p.code)).toEqual(['reports:read', 'students:read']);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
  it('copia los permisos de una plantilla y los suma a los pedidos', async () => {
    const { roles, admin, onChanged } = build(role({ permissions: [perm('reports:read'), perm('students:read')] }));
    await new CreateRoleUseCase(roles, admin, onChanged).execute({ name: 'Copia', description: 'd', copyFromRoleId: 'r1', permissions: ['users:read'] }, 'a1', null, ADMIN_PERMS);

    expect(admin.createWithPermissions.mock.calls[0][0].permissionCodes).toEqual(['reports:read', 'students:read', 'users:read']);
  });
  it('copiar un rol que incluye admin:system (el de administración) se rechaza: no se delega', async () => {
    const { roles, admin, onChanged } = build(role({ name: 'Administrador DBU', isBase: true, permissions: [perm('admin:system'), perm('reports:read')] }));
    await expect(new CreateRoleUseCase(roles, admin, onChanged).execute({ name: 'Copia admin', description: 'd', copyFromRoleId: 'r1' }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(PermissionNotGrantableError);
    expect(admin.createWithPermissions).not.toHaveBeenCalled();
  });
  it('una plantilla inexistente y un nombre repetido se rechazan sin crear nada', async () => {
    const { roles, admin, onChanged } = build(null);
    await expect(new CreateRoleUseCase(roles, admin, onChanged).execute({ name: 'X1x', description: 'd', copyFromRoleId: 'nope' }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(RoleNotFoundError);
    roles.findByName.mockResolvedValue(role());
    await expect(new CreateRoleUseCase(roles, admin, onChanged).execute({ name: 'Revisor', description: 'd', permissions: ['reports:read'] }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(RoleAlreadyExistsError);
    expect(admin.createWithPermissions).not.toHaveBeenCalled();
  });
  it('sin permisos ni plantilla conserva el comportamiento anterior (rol vacío)', async () => {
    const { roles, admin, onChanged } = build();
    roles.create.mockResolvedValue(role());
    await new CreateRoleUseCase(roles, admin, onChanged).execute({ name: 'Vacío', description: 'd' }, 'a1', null, ADMIN_PERMS);
    expect(roles.create).toHaveBeenCalledWith({ name: 'Vacío', description: 'd' }, { userId: 'a1', ipAddress: null });
    expect(admin.createWithPermissions).not.toHaveBeenCalled();
  });
});

describe('UpdateRoleUseCase', () => {
  it('actualiza permisos de un rol no base y vacía las cachés (efecto inmediato)', async () => {
    const { roles, admin, onChanged } = build();
    await new UpdateRoleUseCase(roles, admin, onChanged).execute('r1', { permissions: ['students:read'], description: ' nueva ' }, 'a1', '10.0.0.1', ADMIN_PERMS);

    expect(admin.update).toHaveBeenCalledWith('r1', { description: 'nueva', permissionCodes: ['students:read'] }, { userId: 'a1', ipAddress: '10.0.0.1' });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
  it('un rol base no se modifica', async () => {
    const { roles, admin, onChanged } = build(role({ isBase: true }));
    await expect(new UpdateRoleUseCase(roles, admin, onChanged).execute('r1', { permissions: ['students:read'] }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(RoleProtectedError);
    expect(admin.update).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });
  it('no concede admin:system ni permisos del catálogo inexistentes, ni más de lo que posee quien edita', async () => {
    const { roles, admin, onChanged } = build();
    const useCase = new UpdateRoleUseCase(roles, admin, onChanged);
    await expect(useCase.execute('r1', { permissions: ['admin:system'] }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(PermissionNotGrantableError);
    await expect(useCase.execute('r1', { permissions: ['x:y'] }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(UnknownPermissionError);
    await expect(useCase.execute('r1', { permissions: ['users:read'] }, 'a1', null, ['reports:read'])).rejects.toThrow(PermissionNotGrantableError);
    expect(admin.update).not.toHaveBeenCalled();
  });
  it('un rol inexistente da 404', async () => {
    const { roles, admin, onChanged } = build(null);
    await expect(new UpdateRoleUseCase(roles, admin, onChanged).execute('nope', { description: 'd' }, 'a1', null, ADMIN_PERMS)).rejects.toThrow(RoleNotFoundError);
  });
});

describe('SetRoleActiveUseCase', () => {
  it('desactiva un rol sin cuentas y vacía las cachés', async () => {
    const { roles, admin, onChanged } = build();
    const updated = await new SetRoleActiveUseCase(roles, admin, onChanged).execute('r1', false, 'a1', null);
    expect(updated.isActive).toBe(false);
    expect(admin.setActive).toHaveBeenCalledWith('r1', false, { userId: 'a1', ipAddress: null });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
  it('no desactiva un rol que tienen cuentas', async () => {
    const { roles, admin, onChanged } = build();
    admin.countUsers.mockResolvedValue(3);
    await expect(new SetRoleActiveUseCase(roles, admin, onChanged).execute('r1', false, 'a1', null)).rejects.toThrow(RoleInUseError);
    expect(admin.setActive).not.toHaveBeenCalled();
  });
  it('activar no exige que esté sin cuentas, y un rol base no se desactiva', async () => {
    const { roles, admin, onChanged } = build(role({ isActive: false }));
    admin.countUsers.mockResolvedValue(3);
    await new SetRoleActiveUseCase(roles, admin, onChanged).execute('r1', true, 'a1', null);
    expect(admin.setActive).toHaveBeenCalledWith('r1', true, expect.anything());
    const base = build(role({ isBase: true }));
    await expect(new SetRoleActiveUseCase(base.roles, base.admin, base.onChanged).execute('r1', false, 'a1', null)).rejects.toThrow(RoleProtectedError);
  });
});

describe('assertRoleActive', () => {
  it('rechaza un rol desactivado y acepta uno activo o sin la marca', () => {
    expect(() => assertRoleActive({ name: 'X', isActive: false })).toThrow(RoleInactiveError);
    expect(() => assertRoleActive({ name: 'X', isActive: true })).not.toThrow();
    expect(() => assertRoleActive({ name: 'X' })).not.toThrow();
  });
});
