import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { generateSecretToken, hashSecretToken } from '../../src/application/use-cases/auth/secretToken';

/**
 * Aceptación del tutor por ciclo (fase 4) sobre HTTP real y base de datos real: al asignar un ciclo el docente queda pendiente
 * de responder, abre su enlace de un solo uso (sin sesión), acepta con su disponibilidad o rechaza, y el enlace deja de servir.
 * Usa el ciclo 10 y registros propios. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  sistemas: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' },
  mecanica: { email: 'carlos.vega@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

describe('aceptación del tutor por ciclo (fase 4)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolId = '';
  let elenaId = '';
  let jorgeId = '';

  const call = (method: string, path: string, who?: Who, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const cyclePath = `/api/schools/%S/cycle-tutors/10`;
  const path = () => cyclePath.replace('%S', schoolId);
  const row = () => prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle: 10 } } });
  /** El enlace solo viaja por correo; en la prueba se deja una huella conocida para poder abrirlo. */
  const issueLink = async () => {
    const token = generateSecretToken();
    await prisma.cycleTutorAssignment.update({
      where: { id: (await row()).id },
      data: { acceptanceStatus: 'PENDIENTE', acceptanceTokenHash: hashSecretToken(token), acceptanceExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    return token;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de aceptación del tutor.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      const res = await call('POST', '/api/auth/login', undefined, ACCOUNTS[who]);
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    periodId = (await prisma.academicPeriod.findFirstOrThrow({ where: { isActive: true } })).id;
    schoolId = (await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } })).id;
    elenaId = (await prisma.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).id;
    jorgeId = (await prisma.user.findUniqueOrThrow({ where: { email: 'jorge.salazar@untrm.edu.pe' } })).id;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) await prisma.cycleTutorAssignment.deleteMany({ where: { periodId, schoolId, cycle: 10 } });
    await prisma.$disconnect();
  });

  it('al asignar el ciclo el docente queda pendiente de responder (el correo se pide en la misma operación)', async () => {
    if (!dbUp) return;
    const res = await call('PUT', path(), 'sistemas', { tutorId: elenaId });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { acceptanceEmailSent: boolean | null };
    expect(typeof body.acceptanceEmailSent).toBe('boolean');
    const saved = await row();
    expect(saved.acceptanceStatus).toBe('PENDIENTE');
    expect(saved.acceptanceTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('un enlace inventado no revela nada', async () => {
    if (!dbUp) return;
    expect((await call('GET', '/api/tutor-acceptance/inventado')).status).toBe(404);
    expect((await call('POST', '/api/tutor-acceptance/inventado', undefined, { accept: false, reason: 'No puedo asumirlo' })).status).toBe(404);
  });

  it('el docente abre su enlace sin sesión, rechaza una disponibilidad inválida y acepta con una válida; el enlace no se reutiliza', async () => {
    if (!dbUp) return;
    const token = await issueLink();

    const info = await call('GET', `/api/tutor-acceptance/${token}`);
    expect(info.status).toBe(200);
    expect(await info.json()).toMatchObject({ tutorName: expect.stringContaining('Elena'), school: 'Ingeniería de Sistemas', cycle: 10, sessionMinutes: 45 });

    expect((await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: true, availability: [{ day: 1, start: '08:00', end: '08:20' }] })).status).toBe(400);
    expect((await row()).acceptanceStatus).toBe('PENDIENTE');

    const ok = await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: true, availability: [{ day: 2, start: '10:00', end: '11:30', place: 'Aula 12' }] });
    expect(ok.status).toBe(200);
    const saved = await row();
    expect(saved).toMatchObject({ acceptanceStatus: 'ACEPTADA', acceptanceTokenHash: null });
    expect(saved.availability).toEqual([{ day: 2, start: '10:00', end: '11:30', place: 'Aula 12' }]);

    expect((await call('GET', `/api/tutor-acceptance/${token}`)).status).toBe(404);
    expect((await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: false, reason: 'Ya no puedo' })).status).toBe(404);
  });

  it('la coordinación ve la respuesta en el listado del ciclo', async () => {
    if (!dbUp) return;
    const list = (await (await call('GET', `/api/schools/${schoolId}/cycle-tutors`, 'sistemas')).json()) as { cycles: { cycle: number; assignment: { acceptanceStatus: string; availability: { day: number }[] } | null }[] };

    expect(list.cycles[9].assignment).toMatchObject({ acceptanceStatus: 'ACEPTADA' });
    expect(list.cycles[9].assignment?.availability[0].day).toBe(2);
  });

  it('el mismo docente conserva su aceptación; otro docente la reinicia y el rechazo queda con su motivo', async () => {
    if (!dbUp) return;
    await call('PUT', path(), 'sistemas', { tutorId: elenaId });
    expect((await row()).acceptanceStatus).toBe('ACEPTADA');

    await call('PUT', path(), 'sistemas', { tutorId: jorgeId });
    expect((await row()).acceptanceStatus).toBe('PENDIENTE'); // reiniciada y vuelta a pedir al nuevo docente

    const token = await issueLink();
    expect((await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: false })).status).toBe(400);
    expect((await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: false, reason: 'Licencia por estudios' })).status).toBe(200);
    expect(await row()).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineReason: 'Licencia por estudios' });
  });

  it('la coordinación puede reenviar el correo (nuevo enlace) y solo la de esa escuela', async () => {
    if (!dbUp) return;
    const resend = await call('POST', `${path()}/acceptance-request`, 'sistemas');
    expect(resend.status).toBe(200);
    expect((await row()).acceptanceStatus).toBe('PENDIENTE');

    expect((await call('POST', `${path()}/acceptance-request`, 'mecanica')).status).toBe(403);
  });
});
