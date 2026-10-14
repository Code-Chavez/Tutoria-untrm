import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Clave inicial de las cuentas nuevas (A01) sobre HTTP real y base de datos real: la DBU recibe una clave temporal
 * distinta por cuenta, y mientras no se cambie la cuenta solo puede usar su perfil. Usa cuentas propias de la prueba
 * y el administrador del seed. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ADMIN = { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' };
const NEW_PASSWORD = 'ClavePropia2026!';
const stamp = Date.now();
const emails = [`a01-uno-${stamp}@untrm.edu.pe`, `a01-dos-${stamp}@untrm.edu.pe`];

describe('clave inicial de las cuentas nuevas (A01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let tutorRoleId = '';
  const created: { id: string; temporaryPassword: string }[] = [];

  const request = (method: string, path: string, token?: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const login = async (email: string, password: string) => {
    const res = await request('POST', '/api/auth/login', undefined, { email, password });
    return { status: res.status, body: (await res.json()) as { data?: { accessToken: string; user: { mustChangePassword: boolean } } } };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de clave inicial.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;

    adminToken = (await login(ADMIN.email, ADMIN.password)).body.data!.accessToken;
    const role = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });
    tutorRoleId = role.id;

    for (const [index, email] of emails.entries()) {
      const res = await request('POST', '/api/users', adminToken, { email, firstName: `Prueba${index}`, lastName: 'ClaveInicial', roleId: tutorRoleId });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { user: { id: string }; temporaryPassword: string };
      created.push({ id: body.user.id, temporaryPassword: body.temporaryPassword });
    }
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      // Las cuentas de prueba quedan desactivadas: la bitácora las referencia y no se pueden borrar.
      await prisma.user.updateMany({ where: { email: { in: emails } }, data: { isActive: false } });
    }
    await prisma.$disconnect();
  });

  it('cada cuenta nueva recibe una clave temporal propia, que no es la antigua común', () => {
    if (!dbUp) return;
    expect(created[0].temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(created[0].temporaryPassword).not.toBe(created[1].temporaryPassword);
    expect(created.map((c) => c.temporaryPassword)).not.toContain('Tutor2026!');
  });

  it('la clave común antigua ya no abre la cuenta', async () => {
    if (!dbUp) return;
    expect((await login(emails[0], 'Tutor2026!')).status).toBe(401);
  });

  it('con la clave temporal inicia sesión, pero solo puede usar su perfil hasta cambiarla', async () => {
    if (!dbUp) return;
    const { status, body } = await login(emails[0], created[0].temporaryPassword);
    expect(status).toBe(200);
    expect(body.data?.user.mustChangePassword).toBe(true);
    const token = body.data!.accessToken;

    const blocked = await request('GET', '/api/students', token);
    expect(blocked.status).toBe(403);
    expect(((await blocked.json()) as { code?: string }).code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await request('GET', '/api/notifications', token)).status).toBe(403);

    expect((await request('GET', '/api/profile', token)).status).toBe(200);
  });

  it('al cambiar la clave recupera el acceso normal y la temporal deja de servir', async () => {
    if (!dbUp) return;
    const token = (await login(emails[0], created[0].temporaryPassword)).body.data!.accessToken;

    const change = await request('POST', '/api/profile/change-password', token, { currentPassword: created[0].temporaryPassword, newPassword: NEW_PASSWORD });
    expect(change.status).toBe(200);

    expect((await login(emails[0], created[0].temporaryPassword)).status).toBe(401);
    const again = await login(emails[0], NEW_PASSWORD);
    expect(again.body.data?.user.mustChangePassword).toBe(false);
    expect((await request('GET', '/api/students', again.body.data!.accessToken)).status).toBe(200);
  });
});
