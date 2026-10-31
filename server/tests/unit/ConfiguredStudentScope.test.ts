import { StudentAccessGuard, scopeCovers } from '@application/access/StudentAccessGuard';
import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { buildWorld, ROLE_OF, STUDENTS } from '../helpers/world';

function build() {
  const world = buildWorld();
  const policies = { findByUserId: jest.fn<Promise<UserAccessPolicy | null>, [string]>().mockResolvedValue(null) };
  const guard = new StudentAccessGuard(world.users, world.roles, world.schools, world.students, policies);
  return { ...world, policies, configuredGuard: guard };
}

describe('Alcances configurados y paridad histórica (LEV-R12)', () => {
  it.each(Object.keys(ROLE_OF))('sin política explícita, %s conserva exactamente su alcance', async (id) => {
    const world = build();
    expect(await world.configuredGuard.scopeFor(id)).toEqual(await world.guard.scopeFor(id));
  });

  it.each([
    ['NONE', [], [], []],
    ['OWN', [], [], ['a1', 'a2']],
    ['SCHOOLS', ['B'], [], ['b1']],
    ['SCHOOLS', ['A', 'B'], [], ['a1', 'a2', 'a3', 'a4', 'b1']],
    ['FACULTIES', [], ['f'], ['a1', 'a2', 'a3', 'a4', 'b1']],
    ['FACULTIES', [], ['other'], []],
    ['INSTITUTION', [], [], ['a1', 'a2', 'a3', 'a4', 'b1']],
    ['SERVICE', [], [], []],
  ] as const)('%s limita los datos sin depender del nombre del rol', async (kind, schoolIds, facultyIds, visible) => {
    const world = build();
    world.roles.findById.mockResolvedValue({ id: 'custom', name: 'Rol configurado', description: 'Prueba', createdAt: new Date(), permissions: [{ id: 'read', code: 'students:read', description: 'Consultar' }] });
    world.policies.findByUserId.mockResolvedValue({ userId: 'tutorA1', roleId: 'role:Docente Tutor', kind, schoolIds: [...schoolIds], facultyIds: [...facultyIds], service: kind === 'SERVICE' ? 'SALUD' : null, revision: 0 });
    const scope = await world.configuredGuard.scopeFor('tutorA1');
    expect(STUDENTS.filter((student) => scopeCovers(scope, student)).map((student) => student.id)).toEqual(visible);
  });

  it('un cambio de rol invalida el alcance anterior en la siguiente consulta', async () => {
    const world = build();
    world.policies.findByUserId.mockResolvedValue({ userId: 'dbu', roleId: 'old-role', kind: 'INSTITUTION', schoolIds: [], facultyIds: [], service: null, revision: 0 });
    expect(await world.configuredGuard.scopeFor('dbu')).toEqual({ kind: 'NONE' });
    await expect(world.configuredGuard.assertAccess('dbu', 'a1')).rejects.toBeInstanceOf(StudentNotFoundError);
  });

  it('un rol sin permisos no obtiene acceso por tener un alcance institucional', async () => {
    const world = build();
    world.roles.findById.mockResolvedValue({ id: 'empty', name: 'Vacío', description: '', permissions: [], createdAt: new Date() });
    world.policies.findByUserId.mockResolvedValue({ userId: 'dbu', roleId: 'role:Administrador DBU', kind: 'INSTITUTION', schoolIds: [], facultyIds: [], service: null, revision: 0 });
    expect(await world.configuredGuard.scopeFor('dbu')).toEqual({ kind: 'NONE' });
  });

  it('una cuenta inactiva no consulta ni aprovecha su política', async () => {
    const world = build();
    expect(await world.configuredGuard.scopeFor('gone')).toEqual({ kind: 'NONE' });
    expect(world.policies.findByUserId).not.toHaveBeenCalled();
  });
});
