import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Los parámetros de seguridad de acceso gobiernan el comportamiento (A08) sobre HTTP real y base de datos real:
 * el bloqueo por intentos fallidos y su duración, el plazo de inactividad que recibe el cliente y su cumplimiento al
 * renovar la sesión. Cambia los parámetros a través de la API de la DBU y los restaura al terminar. Se omite sin base de
 * datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ADMIN = { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' };
const PASSWORD = 'ClaveSeguridad2026!';
const stamp = Date.now();
const EMAIL = `a08-${stamp}@untrm.edu.pe`;
const KEYS = ['inactivity_timeout_minutes', 'login_max_attempts', 'login_lockout_minutes'] as const;

describe('parámetros de seguridad de acceso (A08)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let userId = '';
  const original: Record<string, string | undefined> = {};

  const call = (method: string, path: string, body?: unknown, token?: string) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const setParam = async (key: string, value: number) => {
    const res = await call('PUT', `/api/system-parameters/${key}`, { value }, adminToken);
    expect(res.status).toBe(200);
  };

  const login = (password: string) => call('POST', '/api/auth/login', { email: EMAIL, password });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de parámetros de seguridad.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;

    adminToken = ((await (await call('POST', '/api/auth/login', ADMIN)).json()) as { data: { accessToken: string } }).data.accessToken;
    for (const key of KEYS) original[key] = (await prisma.systemParameter.findUnique({ where: { key } }))?.value;

    const role = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });
    const created = await call('POST', '/api/users', { email: EMAIL, firstName: 'Prueba', lastName: 'Seguridad', roleId: role.id }, adminToken);
    expect(created.status).toBe(201);
    const body = (await created.json()) as { user: { id: string }; invitation: { link: string } };
    userId = body.user.id;
    // La cuenta nace sin clave: se activa con el enlace de la invitación y la clave que elige la persona.
    const activated = await call('POST', '/api/auth/reset-password', { token: body.invitation.link.split('/').pop(), newPassword: PASSWORD });
    expect(activated.status).toBe(200);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      for (const key of KEYS) {
        if (original[key] !== undefined) await prisma.systemParameter.update({ where: { key }, data: { value: original[key] as string } });
      }
      // La cuenta de prueba queda desactivada: la bitácora la referencia y no se puede borrar.
      await prisma.user.updateMany({ where: { email: EMAIL }, data: { isActive: false, lockedUntil: null } });
    }
    await prisma.$disconnect();
  });

  it('la DBU puede ver y editar los tres parámetros, con su rango', async () => {
    if (!dbUp) return;
    const { parameters: list } = (await (await call('GET', '/api/system-parameters', undefined, adminToken)).json()) as { parameters: { key: string; group: string }[] };
    for (const key of KEYS) expect(list.find((p) => p.key === key)).toMatchObject({ group: 'Seguridad de acceso' });

    const outOfRange = await call('PUT', '/api/system-parameters/login_max_attempts', { value: 1 }, adminToken);
    expect(outOfRange.status).toBe(400);
  });

  it('el bloqueo se aplica al llegar al número de intentos configurado', async () => {
    if (!dbUp) return;
    await setParam('login_max_attempts', 3);
    await setParam('login_lockout_minutes', 20);

    expect((await login('incorrecta-1')).status).toBe(401);
    expect((await login('incorrecta-2')).status).toBe(401);
    expect((await login('incorrecta-3')).status).toBe(401); // tercer intento: bloquea

    // Ya bloqueada: ni la clave correcta entra.
    expect((await login(PASSWORD)).status).toBe(423);

    const locked = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const minutes = ((locked.lockedUntil as Date).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(19);
    expect(minutes).toBeLessThanOrEqual(20);
  });

  it('con un límite mayor el mismo número de intentos no bloquea', async () => {
    if (!dbUp) return;
    await prisma.user.update({ where: { id: userId }, data: { lockedUntil: null, failedLoginAttempts: 0 } });
    await setParam('login_max_attempts', 6);

    expect((await login('incorrecta-1')).status).toBe(401);
    expect((await login('incorrecta-2')).status).toBe(401);
    expect((await login('incorrecta-3')).status).toBe(401);

    expect((await login(PASSWORD)).status).toBe(200); // no hay bloqueo
  });

  it('el cliente recibe el plazo de inactividad configurado y el servidor lo hace valer al renovar la sesión', async () => {
    if (!dbUp) return;
    await setParam('inactivity_timeout_minutes', 10);

    const res = await login(PASSWORD);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { sessionPolicy: { idleTimeoutMinutes: number }; refreshToken: string } };
    expect(body.data.sessionPolicy.idleTimeoutMinutes).toBe(10);

    // Sesión renovada hace 20 min con 10 min de plazo y 15 de vida del access token: dentro de lo permitido (25 min).
    await prisma.refreshToken.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 20 * 60_000) } });
    const fresh = await call('POST', '/api/auth/refresh', { refreshToken: body.data.refreshToken });
    expect(fresh.status).toBe(200);
    const renewed = ((await fresh.json()) as { data: { refreshToken: string } }).data.refreshToken;

    // Inactiva 40 min (> 10 + 15): la sesión terminó aunque el cliente no la haya cerrado.
    await prisma.refreshToken.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 40 * 60_000) } });
    const expired = await call('POST', '/api/auth/refresh', { refreshToken: renewed });
    expect(expired.status).toBe(401);
  });
});
