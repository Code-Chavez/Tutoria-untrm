import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { hashSecretToken } from '../../src/application/use-cases/auth/secretToken';

/**
 * Invitación de acceso único (A01) sobre HTTP real y base de datos real: una cuenta nueva no tiene ninguna clave conocida,
 * se activa con un enlace de un solo uso que vence, reemitir invalida el anterior y solo quien administra usuarios puede
 * hacerlo. Usa cuentas propias de la prueba. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ADMIN = { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' };
const TUTOR = { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' };
const stamp = Date.now();
const email = `invitacion-${stamp}@untrm.edu.pe`;
const CHOSEN = 'ClavePropia2026!';

type Invitation = { link: string; expiresAt: string; emailSent: boolean };

describe('invitación de acceso único (A01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let tutorToken = '';
  let userId = '';
  let firstInvitation: Invitation;

  const call = (method: string, path: string, body?: unknown, token?: string) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const login = (password: string) => call('POST', '/api/auth/login', { email, password });
  const tokenOf = (invitation: Invitation) => invitation.link.split('/').pop() as string;
  const activate = (token: string, newPassword = CHOSEN) => call('POST', '/api/auth/reset-password', { token, newPassword });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de invitaciones.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;

    const token = async (account: { email: string; password: string }) =>
      ((await (await call('POST', '/api/auth/login', account)).json()) as { data: { accessToken: string } }).data.accessToken;
    adminToken = await token(ADMIN);
    tutorToken = await token(TUTOR);

    const role = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });
    const created = await call('POST', '/api/users', { email, firstName: 'Prueba', lastName: 'Invitación', roleId: role.id }, adminToken);
    expect(created.status).toBe(201);
    const body = (await created.json()) as { user: { id: string }; invitation: Invitation; temporaryPassword?: string };
    expect(body.temporaryPassword).toBeUndefined();
    userId = body.user.id;
    firstInvitation = body.invitation;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      // La cuenta de prueba queda desactivada: la bitácora la referencia y no se puede borrar.
      await prisma.user.updateMany({ where: { email }, data: { isActive: false } });
    }
    await prisma.$disconnect();
  });

  it('la cuenta nueva trae un enlace de un solo uso (sin ninguna clave) y queda pendiente de activación', async () => {
    if (!dbUp) return;
    expect(firstInvitation.link).toMatch(/\/activar-cuenta\/[0-9a-f]{64}$/);
    expect(new Date(firstInvitation.expiresAt).getTime()).toBeGreaterThan(Date.now() + 71 * 3_600_000);
    expect(typeof firstInvitation.emailSent).toBe('boolean');

    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(row.mustChangePassword).toBe(true);
  });

  it('en la base solo está la huella del enlace, nunca el enlace', async () => {
    if (!dbUp) return;
    const stored = await prisma.passwordResetToken.findMany({ where: { userId } });

    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).toBe(hashSecretToken(tokenOf(firstInvitation)));
    expect(JSON.stringify(stored)).not.toContain(tokenOf(firstInvitation));
  });

  it('antes de activar no se puede entrar: ni con la clave común antigua ni con una al azar', async () => {
    if (!dbUp) return;
    expect((await login('Tutor2026!')).status).toBe(401);
    expect((await login('cualquier-cosa-1')).status).toBe(401);
  });

  it('reemitir da un enlace nuevo, deja sin efecto el anterior y queda en la bitácora sin el enlace', async () => {
    if (!dbUp) return;
    const res = await call('POST', `/api/users/${userId}/invitation`, undefined, adminToken);
    expect(res.status).toBe(200);
    const second = ((await res.json()) as { invitation: Invitation }).invitation;

    expect(tokenOf(second)).not.toBe(tokenOf(firstInvitation));
    expect((await activate(tokenOf(firstInvitation))).status).toBeGreaterThanOrEqual(400); // el anterior ya no sirve

    const audit = await prisma.auditLog.findMany({ where: { action: 'INVITATION_ISSUED', entityId: userId } });
    expect(audit.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(audit)).not.toContain(tokenOf(second));
    firstInvitation = second;
  });

  it('un enlace vencido no sirve', async () => {
    if (!dbUp) return;
    await prisma.passwordResetToken.updateMany({ where: { userId, used: false }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await activate(tokenOf(firstInvitation))).status).toBeGreaterThanOrEqual(400);

    // Se reemite para continuar la prueba.
    const again = ((await (await call('POST', `/api/users/${userId}/invitation`, undefined, adminToken)).json()) as { invitation: Invitation }).invitation;
    firstInvitation = again;
  });

  it('el enlace vigente activa la cuenta con la clave que elige la persona, y solo una vez', async () => {
    if (!dbUp) return;
    const token = tokenOf(firstInvitation);

    expect((await activate(token)).status).toBe(200);
    expect((await activate(token, 'OtraClave2026!')).status).toBeGreaterThanOrEqual(400); // un solo uso

    const res = await login(CHOSEN);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { user: { mustChangePassword: boolean } } };
    expect(body.data.user.mustChangePassword).toBe(false);
    expect((await login('OtraClave2026!')).status).toBe(401);
  });

  it('solo quien administra usuarios puede emitir invitaciones', async () => {
    if (!dbUp) return;
    expect((await call('POST', `/api/users/${userId}/invitation`, undefined, tutorToken)).status).toBe(403);
    expect((await call('POST', `/api/users/${userId}/invitation`)).status).toBe(401);
  });

  it('reemitir para una cuenta que no existe responde 404', async () => {
    if (!dbUp) return;
    expect((await call('POST', '/api/users/00000000-0000-0000-0000-000000000000/invitation', undefined, adminToken)).status).toBe(404);
  });
});
