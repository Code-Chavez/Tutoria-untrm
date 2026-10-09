import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Ciclo de vida de los avisos (R03) con base real: un aviso nunca apunta a un caso que ya no existe,
 * «marcar todas como leídas» solo toca los avisos propios y la bandeja devuelve los más recientes.
 * Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

describe('ciclo de vida de los avisos (R03)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let tutorId = '';
  let otherId = '';
  let tutorToken = '';
  let studentId = '';
  const referralIds: string[] = [];

  const call = (method: string, path: string, token: string) =>
    fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite el ciclo de vida de los avisos.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    baseUrl = `http://localhost:${(listening.address() as { port: number }).port}`;

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' }),
    });
    tutorToken = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;
    tutorId = (await prisma.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).id;
    otherId = (await prisma.user.findUniqueOrThrow({ where: { email: 'jorge.salazar@untrm.edu.pe' } })).id;
    studentId = (await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.notification.deleteMany({ where: { message: { startsWith: 'Prueba R03' } } });
      await prisma.studentReferral.deleteMany({ where: { id: { in: referralIds } } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  const makeReferral = async () => {
    const referral = await prisma.studentReferral.create({
      data: { studentId, referredById: tutorId, checkedAspects: ['MENTAL_HEALTH_ANXIOUS'], reason: 'Prueba R03', service: 'PSICOLOGIA' },
    });
    referralIds.push(referral.id);
    return referral.id;
  };

  it('al eliminar un caso se eliminan sus avisos: no queda ninguno que apunte a algo inexistente', async () => {
    if (!dbUp) return;
    const referralId = await makeReferral();
    await prisma.notification.create({ data: { userId: tutorId, type: 'REFERRAL_CREATED', message: 'Prueba R03 caso', referralId } });
    expect(await prisma.notification.count({ where: { referralId } })).toBe(1);

    await prisma.studentReferral.delete({ where: { id: referralId } });

    expect(await prisma.notification.count({ where: { referralId } })).toBe(0);
  });

  it('no se puede crear un aviso que apunte a un caso inexistente', async () => {
    if (!dbUp) return;
    await expect(
      prisma.notification.create({
        data: { userId: tutorId, type: 'REFERRAL_CREATED', message: 'Prueba R03 huérfano', referralId: '00000000-0000-0000-0000-000000000000' },
      }),
    ).rejects.toThrow();
  });

  it('«marcar todas como leídas» solo toca los avisos de quien lo pide', async () => {
    if (!dbUp) return;
    await prisma.notification.createMany({
      data: [
        { userId: tutorId, type: 'REFERRAL_CREATED', message: 'Prueba R03 propia 1' },
        { userId: tutorId, type: 'REFERRAL_CREATED', message: 'Prueba R03 propia 2' },
        { userId: otherId, type: 'REFERRAL_CREATED', message: 'Prueba R03 ajena' },
      ],
    });

    const res = await call('PATCH', '/api/notifications/read-all', tutorToken);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { updated: number }).updated).toBeGreaterThanOrEqual(2);

    expect(await prisma.notification.count({ where: { userId: tutorId, read: false } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: otherId, message: 'Prueba R03 ajena', read: false } })).toBe(1);
  });

  it('la bandeja devuelve como máximo los 50 avisos más recientes', async () => {
    if (!dbUp) return;
    await prisma.notification.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({ userId: tutorId, type: 'REFERRAL_CREATED', message: `Prueba R03 volumen ${i}` })),
    });
    const list = (await (await call('GET', '/api/notifications', tutorToken)).json()) as unknown[];
    expect(list.length).toBe(50);
  });
});
