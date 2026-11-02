import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { ownUser, removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';

/**
 * LEV-R12 (API) por HTTP real y base real de pruebas: definir y leer el alcance de una persona con su rol. Datos PROPIOS: dos cuentas
 * que crea (se borran al terminar, con su alcance); la cuenta administradora sembrada solo inicia sesión. Se omite sin base de datos,
 * salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());

describe('alcance por persona por HTTP', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let adminId = '';
  let coordId = '';
  let coordToken = '';
  let tutorId = '';
  let schoolId = '';
  let facultyId = '';

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
      console.warn('Sin base de datos: se omite la prueba HTTP de alcance por persona.');
      return;
    }
    const school = await prisma.school.findFirstOrThrow({ where: { isActive: true } });
    schoolId = school.id;
    facultyId = school.facultyId;
    coordId = await ownUser(prisma, { email: `acceso-coord-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Acceso', lastName: 'Coord' });
    tutorId = await ownUser(prisma, { email: `acceso-tutor-${stamp}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Acceso', lastName: 'Tutor', schoolId });
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    adminToken = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    coordToken = await login(`acceso-coord-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      const ids = [coordId, tutorId].filter(Boolean);
      await prisma.userAccessPolicy.deleteMany({ where: { userId: { in: ids } } });
      await removeOwnUserTraces(prisma, ids);
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it('solo la administración del sistema lee y define el alcance', async () => {
    if (!dbUp) return;
    expect((await call('GET', `/users/${tutorId}/access`, coordToken)).status).toBe(403);
    expect((await call('PUT', `/users/${tutorId}/access`, coordToken, { kind: 'INSTITUTION' })).status).toBe(403);
    expect((await call('GET', `/users/${tutorId}/access`, null)).status).toBe(401);
  });

  it('sin configurar rige el valor por defecto del rol', async () => {
    if (!dbUp) return;
    const res = await call('GET', `/users/${tutorId}/access`, adminToken);
    expect(res.status).toBe(200);
    expect((await json(res)).access).toMatchObject({ source: 'DEFAULT', policy: null, configurable: true, role: { name: 'Docente Tutor' } });
  });

  it('define el alcance por escuela, sube la revisión al cambiarlo y deja la bitácora', async () => {
    if (!dbUp) return;
    const first = await call('PUT', `/users/${coordId}/access`, adminToken, { kind: 'SCHOOLS', schoolIds: [schoolId] });
    expect(first.status).toBe(200);
    expect((await json(first)).access).toMatchObject({ source: 'STORED', policy: { kind: 'SCHOOLS', schoolIds: [schoolId], revision: 0 } });
    const second = await call('PUT', `/users/${coordId}/access`, adminToken, { kind: 'FACULTIES', facultyIds: [facultyId] });
    expect((await json(second)).access.policy).toMatchObject({ kind: 'FACULTIES', schoolIds: [], facultyIds: [facultyId], revision: 1 });
    const read = await json(await call('GET', `/users/${coordId}/access`, adminToken));
    expect(read.access.policy.kind).toBe('FACULTIES');
    const entries = await prisma.auditLog.findMany({ where: { entityId: coordId, action: 'USER_ACCESS_UPDATED' }, orderBy: { createdAt: 'asc' } });
    expect(entries).toHaveLength(2);
    expect(entries[1].userId).toBe(adminId);
    expect(entries[1].details).toContain('SCHOOLS escuelas=1 → FACULTIES facultades=1');
  });

  it('rechaza datos que no corresponden: sin escuelas, escuela inexistente, servicio inválido y tipo desconocido (400)', async () => {
    if (!dbUp) return;
    const bad = async (body: unknown) => (await call('PUT', `/users/${tutorId}/access`, adminToken, body)).status;
    expect(await bad({ kind: 'SCHOOLS', schoolIds: [] })).toBe(400);
    expect(await bad({ kind: 'SCHOOLS', schoolIds: ['00000000-0000-4000-8000-000000000000'] })).toBe(400);
    expect(await bad({ kind: 'SERVICE', service: 'INVENTADO' })).toBe(400);
    expect(await bad({ kind: 'TODO' })).toBe(400);
    expect(await prisma.userAccessPolicy.count({ where: { userId: tutorId } })).toBe(0);
  });

  it('nadie cambia su propio alcance y la administración conserva la institución (409)', async () => {
    if (!dbUp) return;
    const self = await call('PUT', `/users/${adminId}/access`, adminToken, { kind: 'INSTITUTION' });
    expect(self.status).toBe(409);
    expect((await json(self)).code).toBe('ACCESS_SCOPE_NOT_CONFIGURABLE');
  });

  it('el tutorado aparece como no configurable y su alcance no se amplía (409); un usuario inexistente da 404', async () => {
    if (!dbUp) return;
    const studentRole = await prisma.role.findFirstOrThrow({ where: { name: 'Tutorado' } });
    const student = await prisma.user.findFirstOrThrow({ where: { roleId: studentRole.id } });
    expect((await json(await call('GET', `/users/${student.id}/access`, adminToken))).access.configurable).toBe(false);
    expect((await call('PUT', `/users/${student.id}/access`, adminToken, { kind: 'INSTITUTION' })).status).toBe(409);
    expect((await call('GET', '/users/00000000-0000-4000-8000-000000000000/access', adminToken)).status).toBe(404);
  });

  it('al cambiar el rol, el alcance guardado se invalida (queda en NONE) hasta que se defina de nuevo', async () => {
    if (!dbUp) return;
    const tutorRole = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });
    const coordRole = await prisma.role.findFirstOrThrow({ where: { name: 'Coordinador' } });
    await prisma.user.update({ where: { id: coordId }, data: { roleId: tutorRole.id } });
    try {
      const access = (await json(await call('GET', `/users/${coordId}/access`, adminToken))).access;
      expect(access).toMatchObject({ source: 'STORED', role: { name: 'Docente Tutor' }, policy: { kind: 'NONE', schoolIds: [], facultyIds: [] } });
      expect(access.policy.revision).toBeGreaterThan(1);
    } finally {
      await prisma.user.update({ where: { id: coordId }, data: { roleId: coordRole.id } });
    }
  });
});
