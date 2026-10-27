import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';

/**
 * C-3, por HTTP real y base real de pruebas: las tres rutas que pueden desactivar o cambiar de rol a una cuenta
 * (PATCH /users/:id/status, PUT /users/:id/role, PATCH /users/:id) rechazan al último administrador activo con 409, sin modificar
 * nada y dejando el intento registrado; y lo permiten cuando queda otro administrador activo, también sobre uno mismo.
 *
 * Datos PROPIOS y sin tocar ninguna cuenta real: se crea un rol de administración propio, con los permisos mínimos de las rutas, y
 * cuentas propias con ese rol. Para que «administrador» signifique ese rol propio (y no «Administrador DBU», cuyas cuentas
 * sembradas deben quedar intactas), esta prueba sustituye el repositorio de usuarios por el real construido con el nombre del rol
 * propio. LIMITACIÓN: no ejercita el rol real «Administrador DBU» por HTTP con las cuentas sembradas. Se omite sin base de datos,
 * salvo REQUIRE_DB_TESTS=1.
 */
const mockAdminRoleName = `Rol Admin HTTP ${Date.now()}`;
jest.mock('../../src/infrastructure/repositories/PrismaUserRepository', () => {
  const actual = jest.requireActual('../../src/infrastructure/repositories/PrismaUserRepository');
  return {
    ...actual,
    PrismaUserRepository: class extends actual.PrismaUserRepository {
      constructor(client: unknown) {
        super(client, mockAdminRoleName);
      }
    },
  };
});

const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const OTHER_ROLE = `Rol Otro HTTP ${stamp}`;
const MANAGER_ROLE = `Rol Gestor HTTP ${stamp}`;
const PERMISSIONS = ['users:delete', 'users:write', 'admin:system'];
const MESSAGE = /última cuenta de administración activa/;

describe('última cuenta de administración activa por HTTP', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminRoleId = '';
  let otherRoleId = '';
  let managerRoleId = '';
  let a = '';
  let b = '';
  let c = '';
  const emails: string[] = [];
  const ownUserIds: string[] = [];
  const tokens = {} as Record<'a' | 'b' | 'c', string>;

  const call = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const state = (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: { isActive: true, roleId: true } });
  const logActions = async (id: string) => (await prisma.auditLog.findMany({ where: { entity: 'User', entityId: id }, orderBy: { createdAt: 'asc' } })).map((e) => e.action);
  const clearLog = () => prisma.auditLog.deleteMany({ where: { entity: 'User', entityId: { in: [a, b] } } });
  /** `a` y `b` quedan con el rol de administración propio y el estado indicado. */
  const setAdmins = async (activeA: boolean, activeB: boolean) => {
    await prisma.user.update({ where: { id: a }, data: { roleId: adminRoleId, isActive: activeA } });
    await prisma.user.update({ where: { id: b }, data: { roleId: adminRoleId, isActive: activeB } });
    await clearLog();
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP de la última cuenta de administración.');
      return;
    }
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    adminRoleId = (await prisma.role.create({ data: { name: mockAdminRoleName, description: 'prueba' } })).id;
    otherRoleId = (await prisma.role.create({ data: { name: OTHER_ROLE, description: 'prueba' } })).id;
    managerRoleId = (await prisma.role.create({ data: { name: MANAGER_ROLE, description: 'prueba' } })).id;
    const permissions = await prisma.permission.findMany({ where: { code: { in: PERMISSIONS } } });
    expect(permissions).toHaveLength(PERMISSIONS.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: adminRoleId, permissionId: p.id })) });
    // El gestor tiene los permisos de las rutas pero NO el rol de administración: actúa siempre sobre otra persona.
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: managerRoleId, permissionId: p.id })) });
    for (const key of ['a', 'b', 'c'] as const) {
      const email = `adm-http-${stamp}-${key}@untrm.edu.pe`;
      emails.push(email);
      const user = await prisma.user.create({ data: { email, passwordHash: hash, firstName: 'Prueba', lastName: `Http ${key}`, roleId: key === 'c' ? managerRoleId : adminRoleId } });
      ownUserIds.push(user.id);
      if (key === 'a') a = user.id;
      else if (key === 'b') b = user.id;
      else c = user.id;
    }

    // La aplicación se carga ahora: el repositorio de usuarios sustituido ya conoce el nombre del rol propio.
    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const [key, email] of [['a', emails[0]], ['b', emails[1]], ['c', emails[2]]] as const) {
      const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: DEMO_PASSWORD }) });
      tokens[key] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await removeOwnUserTraces(prisma, ownUserIds, ownUserIds);
      await prisma.user.deleteMany({ where: { id: { in: ownUserIds } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: [adminRoleId, managerRoleId].filter(Boolean) } } });
      await prisma.role.deleteMany({ where: { id: { in: [adminRoleId, otherRoleId, managerRoleId].filter(Boolean) } } });
    }
    await prisma.$disconnect();
  });

  it('PATCH /users/:id/status: el último administrador no se desactiva (ni a sí mismo): 409, nada cambia y el intento queda registrado', async () => {
    if (!dbUp) return;
    await setAdmins(true, false);

    const res = await call('PATCH', `/api/users/${a}/status`, tokens.a);

    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(MESSAGE);
    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
    expect(await logActions(a)).toEqual(['USER_CHANGE_REJECTED']);
  });

  it('PUT /users/:id/role: al último administrador no se le cambia el rol: 409, nada cambia y el intento queda registrado', async () => {
    if (!dbUp) return;
    await setAdmins(true, false);

    const res = await call('PUT', `/api/users/${a}/role`, tokens.a, { roleId: otherRoleId });

    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(MESSAGE);
    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
    expect(await logActions(a)).toEqual(['USER_CHANGE_REJECTED']);
  });

  it('PATCH /users/:id: tampoco se le cambia el rol por la edición de la cuenta: 409, nada cambia y el intento queda registrado', async () => {
    if (!dbUp) return;
    await setAdmins(true, false);

    const res = await call('PATCH', `/api/users/${a}`, tokens.a, { roleId: otherRoleId });

    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(MESSAGE);
    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
    expect(await logActions(a)).toEqual(['USER_CHANGE_REJECTED']);
  });

  it('sobre otro usuario: un gestor que no es administrador tampoco puede desactivar ni cambiar de rol al último administrador', async () => {
    if (!dbUp) return;
    await setAdmins(false, true);

    const status = await call('PATCH', `/api/users/${b}/status`, tokens.c);
    const role = await call('PUT', `/api/users/${b}/role`, tokens.c, { roleId: otherRoleId });
    const edit = await call('PATCH', `/api/users/${b}`, tokens.c, { roleId: otherRoleId });

    expect([status.status, role.status, edit.status]).toEqual([409, 409, 409]);
    expect(await state(b)).toEqual({ isActive: true, roleId: adminRoleId });
    expect(await logActions(b)).toEqual(['USER_CHANGE_REJECTED', 'USER_CHANGE_REJECTED', 'USER_CHANGE_REJECTED']);
    expect((await prisma.auditLog.findMany({ where: { entityId: b, action: 'USER_CHANGE_REJECTED' } })).every((e) => e.userId === c)).toBe(true);
  });

  it('con otro administrador activo las tres rutas lo permiten, también sobre uno mismo, con su auditoría habitual y sin registro de rechazo', async () => {
    if (!dbUp) return;
    await setAdmins(true, true);

    // Cambio de rol de otro (b) por la ruta de roles.
    let res = await call('PUT', `/api/users/${b}/role`, tokens.a, { roleId: otherRoleId });
    expect(res.status).toBe(200);
    expect(await state(b)).toMatchObject({ roleId: otherRoleId });
    expect(await logActions(b)).toEqual(expect.not.arrayContaining(['USER_CHANGE_REJECTED']));

    // b vuelve a administrador por la edición de la cuenta; a se desactiva a sí mismo (queda b).
    res = await call('PATCH', `/api/users/${b}`, tokens.a, { roleId: adminRoleId });
    expect(res.status).toBe(200);
    res = await call('PATCH', `/api/users/${a}/status`, tokens.a);
    expect(res.status).toBe(200);
    expect(await state(a)).toMatchObject({ isActive: false });
    expect(await logActions(a)).toEqual(['UPDATE']);

    // Ahora b es el último: no puede desactivarse.
    res = await call('PATCH', `/api/users/${b}/status`, tokens.b);
    expect(res.status).toBe(409);
    expect(await state(b)).toMatchObject({ isActive: true });
  });
});
