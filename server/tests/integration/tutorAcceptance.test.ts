import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { currentPeriodId } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, ownUser, removeOwnUserTraces } from '../helpers/ownUsers';
import { generateSecretToken, hashSecretToken } from '../../src/application/use-cases/auth/secretToken';

/**
 * Aceptación del tutor por ciclo (fase 4) sobre HTTP real y base de datos real: al asignar un ciclo el docente queda pendiente
 * de responder, abre su enlace de un solo uso (sin sesión), acepta con su disponibilidad o rechaza, y el enlace deja de servir.
 * Trabaja en una escuela propia, con coordinaciones y docentes propios (ninguna cuenta de demostración inicia sesión), que crea y borra: así no comparte el ciclo ni a los docentes con las demás
 * suites de tutor por ciclo (un docente solo atiende un ciclo, y dos suites a la vez se pisarían). Se omite sin base de datos,
 * salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

type Who = 'sistemas' | 'mecanica'; // coordinación de la escuela propia / otra coordinación propia que no coordina esa escuela

const stamp = String(Date.now());

describe('aceptación del tutor por ciclo (fase 4)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolId = '';
  let schoolName = '';
  let elenaId = ''; // primer docente de la escuela propia
  let jorgeId = ''; // segundo docente de la escuela propia
  const ownUserIds: string[] = [];

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
    periodId = await currentPeriodId(prisma);
    // Escuela propia: misma facultad y sede que Sistemas, con su propia coordinación, sin estudiantes matriculados
    const sistemas = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    schoolName = `Escuela de prueba de aceptación ${stamp}`;
    schoolId = (await prisma.school.create({ data: { name: schoolName, facultyId: sistemas.facultyId, campusId: sistemas.campusId } })).id;
    const coordinator = async (suffix: string) => {
      const email = `acept-${stamp}-coord-${suffix}@untrm.edu.pe`;
      ownUserIds.push(await ownUser(prisma, { email, roleName: 'Coordinador', firstName: 'Coordinación', lastName: `Aceptación ${suffix} ${stamp}` }));
      return { email, password: DEMO_PASSWORD };
    };
    const credentials: Record<Who, { email: string; password: string }> = { sistemas: await coordinator('a'), mecanica: await coordinator('b') };
    await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: ownUserIds[0] } });
    for (const who of Object.keys(credentials) as Who[]) {
      const res = await call('POST', '/api/auth/login', undefined, credentials[who]);
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    const teacher = async (suffix: string, lastName: string) => {
      const id = await ownUser(prisma, { email: `acept-${stamp}-${suffix}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Docente', lastName, schoolId });
      ownUserIds.push(id);
      return id;
    };
    elenaId = await teacher('a', `Aceptación Alfa ${stamp}`);
    jorgeId = await teacher('b', `Aceptación Beta ${stamp}`);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp && schoolId) {
      const assignmentIds = (await prisma.cycleTutorAssignment.findMany({ where: { schoolId }, select: { id: true } })).map((a) => a.id);
      await prisma.cycleTutorAssignment.deleteMany({ where: { schoolId } });
      // La aceptación por enlace deja su bitácora a nombre del docente; las sesiones iniciadas y los avisos, a nombre de las cuentas propias
      await removeOwnUserTraces(prisma, ownUserIds, [schoolId, ...assignmentIds]);
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: null } });
      await prisma.user.deleteMany({ where: { id: { in: ownUserIds } } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
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
    expect(await info.json()).toMatchObject({ tutorName: expect.stringContaining('Alfa'), school: schoolName, cycle: 10, sessionMinutes: 45 });

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
