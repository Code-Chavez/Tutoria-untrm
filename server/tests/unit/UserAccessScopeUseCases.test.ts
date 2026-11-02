import { GetUserAccessUseCase, SetUserAccessUseCase } from '@application/use-cases/users/UserAccessScopeUseCases';
import { AccessScopeInvalidError, AccessScopeNotConfigurableError } from '@application/use-cases/users/userAccessScope';
import { RoleTargetUserNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { UserAccessPolicyRepository } from '@domain/repositories/UserAccessPolicyRepository';

// Alcance por persona (LEV-R12, API): reglas con repositorios simulados; la transacción real y las rutas, en tests/integration/userAccessHttp.test.ts.
const role = (name: string, id = `role-${name}`) => ({ id, name, description: '', permissions: [], createdAt: new Date() });
const user = (roleId: string, id = 'u1') => ({ id, roleId }) as never;
const policy = (over: Partial<UserAccessPolicy> = {}): UserAccessPolicy => ({ userId: 'u1', roleId: 'role-Coordinador', kind: 'OWN', schoolIds: [], facultyIds: [], service: null, revision: 0, ...over });

function build(roleName = 'Coordinador', stored: UserAccessPolicy | null = null) {
  const users = { findById: jest.fn().mockResolvedValue(user(`role-${roleName}`)) } as unknown as jest.Mocked<UserRepository>;
  const roles = { findById: jest.fn().mockResolvedValue(role(roleName)) } as unknown as jest.Mocked<RoleRepository>;
  const schools = { findAll: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]), findById: jest.fn() };
  const faculties = { findAll: jest.fn().mockResolvedValue([{ id: 'f1' }]) };
  const policies: jest.Mocked<UserAccessPolicyRepository> = {
    findByUserId: jest.fn().mockResolvedValue(stored),
    save: jest.fn().mockImplementation(async (p) => ({ ...p, revision: 1 })),
  };
  const set = new SetUserAccessUseCase(users, roles, schools as never, faculties as never, policies);
  const get = new GetUserAccessUseCase(users, roles, policies);
  return { users, roles, policies, set, get };
}

describe('GetUserAccessUseCase', () => {
  it('sin alcance guardado indica que rige el comportamiento por defecto del rol', async () => {
    const { get } = build();
    expect(await get.execute('u1')).toMatchObject({ policy: null, source: 'DEFAULT', configurable: true, role: { name: 'Coordinador' } });
  });
  it('un alcance guardado para el rol actual se devuelve; el de un rol anterior se marca como no vigente', async () => {
    expect((await build('Coordinador', policy({ kind: 'SCHOOLS', schoolIds: ['s1'], revision: 2 })).get.execute('u1')).policy).toEqual({ kind: 'SCHOOLS', schoolIds: ['s1'], facultyIds: [], service: null, revision: 2 });
    expect(await build('Coordinador', policy({ roleId: 'role-Decano' })).get.execute('u1')).toMatchObject({ policy: null, source: 'OUTDATED' });
  });
  it('el tutorado no es configurable y una persona inexistente da error', async () => {
    expect((await build('Tutorado').get.execute('u1')).configurable).toBe(false);
    const { get, users } = build();
    users.findById.mockResolvedValue(null);
    await expect(get.execute('nope')).rejects.toThrow(RoleTargetUserNotFoundError);
  });
});

describe('SetUserAccessUseCase', () => {
  it('guarda un alcance por escuelas sin repetidos, con quién lo hizo, y lo devuelve como vigente', async () => {
    const { set, policies } = build();
    const view = await set.execute('u1', { kind: 'SCHOOLS', schoolIds: ['s2', 's1', 's1'], service: 'SALUD' }, 'admin', '10.0.0.1');
    expect(policies.save).toHaveBeenCalledWith({ userId: 'u1', roleId: 'role-Coordinador', kind: 'SCHOOLS', schoolIds: ['s1', 's2'], facultyIds: [], service: null }, { userId: 'admin', ipAddress: '10.0.0.1' }, 'Coordinador');
    expect(view).toMatchObject({ source: 'STORED', policy: { kind: 'SCHOOLS', schoolIds: ['s1', 's2'] } });
  });
  it('exige lo que cada tipo necesita y que existan las escuelas, facultades o el servicio', async () => {
    const { set, policies } = build();
    await expect(set.execute('u1', { kind: 'SCHOOLS' }, 'admin', null)).rejects.toThrow(AccessScopeInvalidError);
    await expect(set.execute('u1', { kind: 'SCHOOLS', schoolIds: ['otra'] }, 'admin', null)).rejects.toThrow(AccessScopeInvalidError);
    await expect(set.execute('u1', { kind: 'FACULTIES', facultyIds: [] }, 'admin', null)).rejects.toThrow(AccessScopeInvalidError);
    await expect(set.execute('u1', { kind: 'FACULTIES', facultyIds: ['otra'] }, 'admin', null)).rejects.toThrow(AccessScopeInvalidError);
    await expect(set.execute('u1', { kind: 'SERVICE', service: 'INVENTADO' }, 'admin', null)).rejects.toThrow(AccessScopeInvalidError);
    expect(policies.save).not.toHaveBeenCalled();
  });
  it('los tipos sin datos descartan lo que sobre (OWN, INSTITUTION, NONE)', async () => {
    const { set, policies } = build('Docente Tutor');
    await set.execute('u1', { kind: 'OWN', schoolIds: ['s1'], facultyIds: ['f1'], service: 'SALUD' }, 'admin', null);
    expect(policies.save.mock.calls[0][0]).toMatchObject({ kind: 'OWN', schoolIds: [], facultyIds: [], service: null });
  });
  it('nadie cambia su propio alcance', async () => {
    const { set, policies } = build();
    await expect(set.execute('u1', { kind: 'INSTITUTION' }, 'u1', null)).rejects.toThrow(AccessScopeNotConfigurableError);
    expect(policies.save).not.toHaveBeenCalled();
  });
  it('el tutorado no se amplía y la administración conserva la institución', async () => {
    const student = build('Tutorado');
    await expect(student.set.execute('u1', { kind: 'INSTITUTION' }, 'admin', null)).rejects.toThrow(AccessScopeNotConfigurableError);
    const admin = build('Administrador DBU');
    await expect(admin.set.execute('u1', { kind: 'OWN' }, 'a2', null)).rejects.toThrow(AccessScopeNotConfigurableError);
    await expect(admin.set.execute('u1', { kind: 'INSTITUTION' }, 'a2', null)).resolves.toMatchObject({ policy: { kind: 'INSTITUTION' } });
    expect(student.policies.save).not.toHaveBeenCalled();
  });
});
