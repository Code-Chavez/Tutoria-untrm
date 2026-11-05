import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import { TutoringRequestRouter } from '@application/use-cases/tutoring-requests/TutoringRequestRouter';
import { GetOwnRequestRecipientUseCase } from '@application/use-cases/tutoring-requests/GetOwnRequestRecipientUseCase';
import { NoRoutingTargetError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

// U02: a quién llega una solicitud, con una sola regla para enrutarla y para decírselo al estudiante antes de enviarla.
describe('a quién llega una solicitud de tutoría', () => {
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let router: TutoringRequestRouter;

  beforeEach(() => {
    schools = { findById: jest.fn().mockResolvedValue({ id: 'sch', coordinatorId: 'coord-1' }) } as unknown as jest.Mocked<SchoolRepository>;
    users = {
      findById: jest.fn().mockImplementation(async (id: string) => ({ id, isActive: true, roleId: id === 'coord-1' ? 'r-coord' : 'r-other', firstName: id === 'tutor-1' ? 'Elena' : id === 'coord-1' ? 'Rosa' : 'Dora', lastName: 'Apellido' })),
      findAll: jest.fn().mockResolvedValue([{ id: 'dbu-1' }]),
    } as unknown as jest.Mocked<UserRepository>;
    roles = { findByName: jest.fn().mockImplementation(async (name: string) => ({ id: name === 'Coordinador' ? 'r-coord' : 'r-dbu' })) } as unknown as jest.Mocked<RoleRepository>;
    router = new TutoringRequestRouter(schools, users, roles);
  });

  it('con tutor asignado, llega a su tutor', async () => {
    expect(await router.resolve('tutor-1', 'sch')).toEqual({ routedToId: 'tutor-1', routedToRole: 'tutor', kind: 'tutor' });
  });

  it('si el tutor asignado tiene la cuenta desactivada o ya no existe, llega a la coordinación (no a quien no puede atender)', async () => {
    users.findById.mockResolvedValueOnce({ id: 'tutor-1', isActive: false } as never);
    expect(await router.resolve('tutor-1', 'sch')).toEqual({ routedToId: 'coord-1', routedToRole: 'coordinator', kind: 'coordinator' });
    users.findById.mockResolvedValueOnce(null);
    expect(await router.resolve('tutor-1', 'sch')).toEqual({ routedToId: 'coord-1', routedToRole: 'coordinator', kind: 'coordinator' });
  });

  it('sin tutor, a la coordinación de su escuela', async () => {
    expect(await router.resolve(null, 'sch')).toEqual({ routedToId: 'coord-1', routedToRole: 'coordinator', kind: 'coordinator' });
  });

  it('una coordinación desactivada, o que ya no tiene el rol de coordinación, no recibe: pasa a la DBU', async () => {
    users.findById.mockImplementation(async (id: string) => ({ id, isActive: false, roleId: 'r-coord' }) as never);
    expect(await router.resolve(null, 'sch')).toMatchObject({ routedToId: 'dbu-1', kind: 'dbu' });
    users.findById.mockImplementation(async (id: string) => ({ id, isActive: true, roleId: 'r-otro-rol' }) as never);
    expect(await router.resolve(null, 'sch')).toMatchObject({ routedToId: 'dbu-1', kind: 'dbu' });
  });

  it('sin tutor y sin coordinación, a un Administrador DBU activo (la solicitud nunca se pierde)', async () => {
    schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
    expect(await router.resolve(undefined, 'sch')).toEqual({ routedToId: 'dbu-1', routedToRole: 'coordinator', kind: 'dbu' });
    expect(users.findAll).toHaveBeenCalledWith({ isActive: true, roleId: 'r-dbu' });
  });

  it('si no hay a quién enrutar, lo dice (no se registra a ciegas)', async () => {
    schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
    users.findAll.mockResolvedValue([]);
    await expect(router.resolve(null, 'sch')).rejects.toBeInstanceOf(NoRoutingTargetError);
  });

  describe('consulta previa del estudiante', () => {
    let students: jest.Mocked<StudentRepository>;
    const useCase = () => new GetOwnRequestRecipientUseCase(students, users, router);

    it('dice quién la recibirá y de qué tipo, con el nombre', async () => {
      students = { findByUserId: jest.fn().mockResolvedValue({ id: 's1', tutorId: 'tutor-1', schoolId: 'sch' }) } as unknown as jest.Mocked<StudentRepository>;
      expect(await useCase().execute('u1')).toEqual({ kind: 'tutor', name: 'Elena Apellido' });

      students.findByUserId.mockResolvedValue({ id: 's1', tutorId: null, schoolId: 'sch' } as never);
      expect(await useCase().execute('u1')).toEqual({ kind: 'coordinator', name: 'Rosa Apellido' });
    });

    it('sin cuenta vinculada a un estudiante devuelve null; sin a quién enrutar devuelve «none» (no se promete atención)', async () => {
      students = { findByUserId: jest.fn().mockResolvedValue(null) } as unknown as jest.Mocked<StudentRepository>;
      expect(await useCase().execute('u1')).toBeNull();

      students.findByUserId.mockResolvedValue({ id: 's1', tutorId: null, schoolId: 'sch' } as never);
      schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
      users.findAll.mockResolvedValue([]);
      expect(await useCase().execute('u1')).toEqual({ kind: 'none', name: '' });
    });
  });
});

// Lo que se le anuncia al estudiante antes de enviar es lo que queda registrado: se prueba con el mismo estado de cuentas.
describe('lo anunciado coincide con lo registrado (U02)', () => {
  type Acct = { isActive: boolean; roleId: string };
  const build = (accts: Record<string, Acct | null>, opts: { coordinatorId?: string | null; dbu?: boolean } = {}) => {
    const schools = { findById: jest.fn().mockResolvedValue({ id: 'sch', coordinatorId: opts.coordinatorId ?? null }) } as unknown as jest.Mocked<SchoolRepository>;
    const users = {
      findById: jest.fn().mockImplementation(async (id: string) => (accts[id] ? { id, firstName: id, lastName: 'X', ...accts[id] } : null)),
      findAll: jest.fn().mockResolvedValue(opts.dbu === false ? [] : [{ id: 'dbu-1' }]),
    } as unknown as jest.Mocked<UserRepository>;
    const roles = { findByName: jest.fn().mockImplementation(async (name: string) => ({ id: name === 'Coordinador' ? 'r-coord' : 'r-dbu' })) } as unknown as jest.Mocked<RoleRepository>;
    const router = new TutoringRequestRouter(schools, users, roles);
    const student = { id: 's1', userId: 'u-est', tutorId: 'tutor-1', schoolId: 'sch', firstName: 'Ana', lastName: 'T' };
    const students = { findByUserId: jest.fn().mockResolvedValue(student) } as unknown as jest.Mocked<StudentRepository>;
    const created = jest.fn().mockImplementation(async (d: { routedToId: string; routedToRole: string }) => ({ id: 'req-1', caseType: 'ACADEMIC', ...d }));
    const requests = { create: created } as never;
    const notifications = { create: jest.fn() } as never;
    const guard = {} as never;
    const create = new CreateTutoringRequestUseCase(requests, guard, schools, users, roles, notifications);
    const announce = () => new GetOwnRequestRecipientUseCase(students, users, router).execute('u-est');
    const register = () => create.registerFor(student as never, 'u-est', { source: 'STUDENT', caseType: 'ACADEMIC', reason: 'Necesito apoyo' });
    return { announce, register, created };
  };

  const ok: Acct = { isActive: true, roleId: 'r-other' };
  const coord: Acct = { isActive: true, roleId: 'r-coord' };

  it.each([
    ['tutor activo', { 'tutor-1': ok, 'coord-1': coord }, 'tutor-1', 'tutor'],
    ['tutor desactivado → coordinación', { 'tutor-1': { ...ok, isActive: false }, 'coord-1': coord }, 'coord-1', 'coordinator'],
    ['tutor inexistente → coordinación', { 'coord-1': coord }, 'coord-1', 'coordinator'],
    ['tutor desactivado y coordinación desactivada → DBU', { 'tutor-1': { ...ok, isActive: false }, 'coord-1': { ...coord, isActive: false }, 'dbu-1': ok }, 'dbu-1', 'dbu'],
    ['coordinación sin el rol → DBU', { 'tutor-1': { ...ok, isActive: false }, 'coord-1': ok, 'dbu-1': ok }, 'dbu-1', 'dbu'],
  ])('%s', async (_name, accts, expectedId, expectedKind) => {
    const { announce, register, created } = build(accts as Record<string, Acct>, { coordinatorId: 'coord-1' });
    const announced = await announce();
    const registered = await register();
    expect(announced?.kind).toBe(expectedKind);
    expect(registered.routedToId).toBe(expectedId);
    expect(announced?.name).toBe(`${expectedId} X`);
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('sin ningún destinatario disponible: se anuncia «none» y el registro se rechaza sin guardar nada (no se promete atención)', async () => {
    const { announce, register, created } = build({ 'tutor-1': { ...ok, isActive: false }, 'coord-1': { ...coord, isActive: false } }, { coordinatorId: 'coord-1', dbu: false });
    expect(await announce()).toEqual({ kind: 'none', name: '' });
    await expect(register()).rejects.toBeInstanceOf(NoRoutingTargetError);
    expect(created).not.toHaveBeenCalled();
  });
});
