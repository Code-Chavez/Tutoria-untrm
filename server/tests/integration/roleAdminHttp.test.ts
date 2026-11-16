import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { ownUser, removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';

/**
 * LEV-R11 (primera parte) por HTTP real y base real de pruebas: crear roles con permisos del catálogo, editarlos con efecto
 * inmediato, protección de los roles base, no delegar admin:system, desactivar y asignar. Datos PROPIOS: los roles y la cuenta que
 * crea (se borran al terminar); la cuenta administradora sembrada solo inicia sesión. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const NAME = (s: string) => `Rol Prueba ${s} ${stamp}`;

describe('administración de roles por HTTP', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let memberId = '';
  let memberToken = '';
  let studentId = '';
  let studentToken = '';
  const createdRoleIds: string[] = [];

  const call = (method: string, path: string, token: string | null, body?: unknown) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const login = async (email: string, password: string) => ((await json(await call('POST', '/auth/login', null, { email, password }))).data as { accessToken: string }).accessToken;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP de administración de roles.');
      return;
    }
    memberId = await ownUser(prisma, { email: `roles-http-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Rol', lastName: 'Prueba' });
    studentId = await ownUser(prisma, { email: `roles-http-est-${stamp}@untrm.edu.pe`, roleName: 'Tutorado', firstName: 'Rol', lastName: 'Estudiante' });
    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    adminToken = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    memberToken = await login(`roles-http-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    studentToken = await login(`roles-http-est-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await removeOwnUserTraces(prisma, [memberId, studentId].filter(Boolean), createdRoleIds);
      await prisma.user.deleteMany({ where: { id: { in: [memberId, studentId].filter(Boolean) } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: createdRoleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
    }
    await prisma.$disconnect();
  });

  it('solo la administración del sistema crea, edita y desactiva roles', async () => {
    if (!dbUp) return;
    expect((await call('POST', '/roles', memberToken, { name: NAME('x'), description: 'd', permissions: [] })).status).toBe(403);
    expect((await call('PUT', '/roles/00000000-0000-4000-8000-000000000000', memberToken, { description: 'd' })).status).toBe(403);
    expect((await call('PATCH', '/roles/00000000-0000-4000-8000-000000000000/status', memberToken, { isActive: false })).status).toBe(403);
    expect((await call('PUT', '/roles/00000000-0000-4000-8000-000000000000', null, { description: 'd' })).status).toBe(401);
  });

  it('crea un rol con permisos del catálogo (queda no base y activo) y deja la bitácora', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/roles', adminToken, { name: NAME('crear'), description: 'Prueba', permissions: ['students:read', 'reports:read', 'reports:read'] });
    expect(res.status).toBe(201);
    const { role } = await json(res);
    createdRoleIds.push(role.id);
    expect(role).toMatchObject({ isBase: false, isActive: true });
    expect(role.permissions.map((p: { code: string }) => p.code).sort()).toEqual(['reports:read', 'students:read']);
    const entry = await prisma.auditLog.findFirst({ where: { entityId: role.id, action: 'ROLE_CREATED' } });
    expect(entry?.details).toContain('reports:read, students:read');
  });

  it('no acepta permisos inexistentes (400) ni admin:system (403, no delegable) y no deja el rol a medias', async () => {
    if (!dbUp) return;
    const unknown = await call('POST', '/roles', adminToken, { name: NAME('desconocido'), description: 'd', permissions: ['inventado:todo'] });
    expect(unknown.status).toBe(400);
    expect((await json(unknown)).code).toBe('UNKNOWN_PERMISSION');
    const admin = await call('POST', '/roles', adminToken, { name: NAME('admin'), description: 'd', permissions: ['admin:system'] });
    expect(admin.status).toBe(403);
    expect((await json(admin)).code).toBe('PERMISSION_NOT_GRANTABLE');
    expect(await prisma.role.count({ where: { name: { in: [NAME('desconocido'), NAME('admin')] } } })).toBe(0);
  });

  it('crea un rol copiando una plantilla; copiar el rol de administración se rechaza', async () => {
    if (!dbUp) return;
    const coord = await prisma.role.findFirstOrThrow({ where: { name: 'Coordinador' } });
    const copy = await call('POST', '/roles', adminToken, { name: NAME('copia'), description: 'd', copyFromRoleId: coord.id });
    expect(copy.status).toBe(201);
    const { role } = await json(copy);
    createdRoleIds.push(role.id);
    expect(role.permissions.length).toBeGreaterThan(5);
    const adminRole = await prisma.role.findFirstOrThrow({ where: { name: 'Administrador DBU' } });
    expect((await call('POST', '/roles', adminToken, { name: NAME('copia-admin'), description: 'd', copyFromRoleId: adminRole.id })).status).toBe(403);
  });

  it('un cambio de permisos rige desde la siguiente petición de quien tiene el rol (sin esperar la caché) y queda en la bitácora', async () => {
    if (!dbUp) return;
    const created = await json(await call('POST', '/roles', adminToken, { name: NAME('efecto'), description: 'd', permissions: ['reports:read'] }));
    const roleId = created.role.id as string;
    createdRoleIds.push(roleId);
    await prisma.user.update({ where: { id: memberId }, data: { roleId } });

    // Sin el permiso: 403. (La lectura de roles está abierta a cualquier sesión; se usa una ruta que exige students:read.)
    const before = await call('GET', '/students', memberToken);
    expect(before.status).toBe(403);

    const update = await call('PUT', `/roles/${roleId}`, adminToken, { permissions: ['reports:read', 'students:read'] });
    expect(update.status).toBe(200);
    const after = await call('GET', '/students', memberToken);
    expect(after.status).not.toBe(403);

    const revoke = await call('PUT', `/roles/${roleId}`, adminToken, { permissions: ['reports:read'] });
    expect(revoke.status).toBe(200);
    expect((await call('GET', '/students', memberToken)).status).toBe(403);

    const entries = await prisma.auditLog.findMany({ where: { entityId: roleId, action: 'ROLE_UPDATED' }, orderBy: { createdAt: 'asc' } });
    expect(entries.map((e) => e.details)).toEqual([expect.stringContaining('añade: students:read'), expect.stringContaining('quita: students:read')]);
  });

  it('la lista de roles (con permisos y cuentas por rol) la ve quien administra usuarios; un tutorado o una sesión ausente no (TT-101)', async () => {
    if (!dbUp) return;
    expect((await call('GET', '/roles', null)).status).toBe(401);
    expect((await call('GET', '/roles', studentToken)).status).toBe(403);
    expect((await call('GET', '/roles', adminToken)).status).toBe(200);
  });

  it('los roles base no se modifican ni se desactivan (409) y su lista los marca como base', async () => {
    if (!dbUp) return;
    const coord = await prisma.role.findFirstOrThrow({ where: { name: 'Coordinador' } });
    const edit = await call('PUT', `/roles/${coord.id}`, adminToken, { permissions: ['reports:read'] });
    expect(edit.status).toBe(409);
    expect((await json(edit)).code).toBe('ROLE_PROTECTED');
    expect((await call('PATCH', `/roles/${coord.id}/status`, adminToken, { isActive: false })).status).toBe(409);
    const list = await json(await call('GET', '/roles', adminToken));
    const names = (list.roles as { name: string; isBase: boolean }[]).filter((r) => r.isBase).map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Administrador DBU', 'Coordinador', 'Docente Tutor', 'Tutorado']));
    expect(await prisma.rolePermission.count({ where: { roleId: coord.id } })).toBeGreaterThan(10); // intactos
  });

  it('desactivar: se rechaza si hay cuentas con el rol; sin cuentas se desactiva, no concede permisos y no se puede asignar', async () => {
    if (!dbUp) return;
    const created = await json(await call('POST', '/roles', adminToken, { name: NAME('desactivar'), description: 'd', permissions: ['students:read'] }));
    const roleId = created.role.id as string;
    createdRoleIds.push(roleId);
    await prisma.user.update({ where: { id: memberId }, data: { roleId } });

    const inUse = await call('PATCH', `/roles/${roleId}/status`, adminToken, { isActive: false });
    expect(inUse.status).toBe(409);
    expect((await json(inUse)).code).toBe('ROLE_IN_USE');

    const coord = await prisma.role.findFirstOrThrow({ where: { name: 'Coordinador' } });
    await prisma.user.update({ where: { id: memberId }, data: { roleId: coord.id } });
    const off = await call('PATCH', `/roles/${roleId}/status`, adminToken, { isActive: false });
    expect(off.status).toBe(200);
    expect((await json(off)).role.isActive).toBe(false);

    // No se puede asignar a una cuenta mientras esté desactivado…
    const assign = await call('PUT', `/users/${memberId}/role`, adminToken, { roleId });
    expect(assign.status).toBe(409);

    // …y al activarlo vuelve a poder asignarse.
    expect((await call('PATCH', `/roles/${roleId}/status`, adminToken, { isActive: true })).status).toBe(200);
    expect((await call('PUT', `/users/${memberId}/role`, adminToken, { roleId })).status).toBe(200);
    await prisma.user.update({ where: { id: memberId }, data: { roleId: coord.id } });
    const entries = await prisma.auditLog.findMany({ where: { entityId: roleId, action: { in: ['ROLE_DEACTIVATED', 'ROLE_ACTIVATED'] } }, orderBy: { createdAt: 'asc' } });
    expect(entries.map((e) => e.action)).toEqual(['ROLE_DEACTIVATED', 'ROLE_ACTIVATED']);
  });

  it('un rol desactivado directamente en la base no concede permisos (defensa en profundidad)', async () => {
    if (!dbUp) return;
    const created = await json(await call('POST', '/roles', adminToken, { name: NAME('inactivo'), description: 'd', permissions: ['students:read'] }));
    const roleId = created.role.id as string;
    createdRoleIds.push(roleId);
    await prisma.role.update({ where: { id: roleId }, data: { isActive: false } });
    await prisma.user.update({ where: { id: memberId }, data: { roleId } });
    expect((await call('GET', '/students', memberToken)).status).toBe(403);
    const coord = await prisma.role.findFirstOrThrow({ where: { name: 'Coordinador' } });
    await prisma.user.update({ where: { id: memberId }, data: { roleId: coord.id } });
  });

  it('valida el cuerpo: PUT sin descripción ni permisos y PATCH sin isActive dan 400; un rol inexistente da 404', async () => {
    if (!dbUp) return;
    const some = createdRoleIds[0];
    expect((await call('PUT', `/roles/${some}`, adminToken, {})).status).toBe(400);
    expect((await call('PATCH', `/roles/${some}/status`, adminToken, {})).status).toBe(400);
    expect((await call('PUT', '/roles/00000000-0000-4000-8000-000000000000', adminToken, { description: 'd' })).status).toBe(404);
  });
});
