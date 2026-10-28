import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { generateSecretToken, hashSecretToken } from '../../src/application/use-cases/auth/secretToken';
import { ownUser, removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';
import { currentPeriodId } from '../helpers/currentPeriod';

/**
 * LEV-R05 sin envío de correo configurado (SMTP_HOST vacío), por HTTP real y base real: el docente igual recibe su confirmación, el
 * aviso se CONSERVA en cola (no se da por enviado), Pendientes explica la causa y el reenvío responde con la causa y el siguiente
 * paso. El transporte está sustituido (nunca se envía nada). Datos PROPIOS; se borran al terminar.
 */
const mockMail: { sent: number } = { sent: 0 };
jest.mock('../../src/infrastructure/services/SmtpMailer', () => {
  class TestMailer {
    async send(): Promise<void> {
      mockMail.sent += 1;
    }
  }
  return { SmtpMailer: TestMailer, UnconfiguredMailer: TestMailer };
});

const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);
const stamp = String(Date.now());

describe('aviso del rechazo sin envío de correo configurado', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let schoolId = '';
  let periodId = '';
  let coordId = '';
  let tutorId = '';
  let token = '';
  let coordToken = '';

  const call = (method: string, path: string, auth?: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba del aviso sin correo configurado.');
      return;
    }
    process.env.SMTP_HOST = ''; // sin envío de correo configurado, aunque el entorno local tenga uno
    periodId = await currentPeriodId(prisma);
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    coordId = await ownUser(prisma, { email: `avisosin-coord-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Rosa', lastName: 'Sin' });
    schoolId = (await prisma.school.create({ data: { name: `Escuela aviso sin correo ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId, coordinatorId: coordId } })).id;
    tutorId = await ownUser(prisma, { email: `avisosin-docente-${stamp}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Ana', lastName: 'Sin', schoolId });
    token = generateSecretToken();
    await prisma.cycleTutorAssignment.create({
      data: { periodId, schoolId, cycle: 1, tutorId, assignedById: coordId, acceptanceStatus: 'PENDIENTE', acceptanceTokenHash: hashSecretToken(token), acceptanceExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    const login = await call('POST', '/api/auth/login', undefined, { email: `avisosin-coord-${stamp}@untrm.edu.pe`, password: DEMO_PASSWORD });
    coordToken = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      const ids = [coordId, tutorId].filter(Boolean);
      const assignmentIds = (await prisma.cycleTutorAssignment.findMany({ where: { schoolId }, select: { id: true } })).map((a) => a.id);
      await prisma.cycleTutorAssignment.deleteMany({ where: { schoolId } });
      await removeOwnUserTraces(prisma, ids, [schoolId, ...assignmentIds]);
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: null } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    await prisma.$disconnect();
  });

  it('el docente recibe su confirmación; el aviso se conserva EN_COLA y no se intenta ni se da por enviado', async () => {
    if (!dbUp) return;
    const res = await call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: false, reason: 'Licencia por estudios' });
    await new Promise((r) => setTimeout(r, 300)); // si hubiera un intento inmediato, ya habría ocurrido

    expect(res.status).toBe(200);
    const a = await prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle: 1 } } });
    expect(a).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineNoticeStatus: 'EN_COLA' });
    expect(mockMail.sent).toBe(0);
  });

  it('Pendientes lo muestra EN_COLA con el envío no configurado y sin ofrecer reenviar', async () => {
    if (!dbUp) return;
    const body = await json(await call('GET', '/api/institutional-pending', coordToken));

    const item = (body.items as { kind: string; schoolId: string; notice?: Record<string, unknown> }[]).find((i) => i.kind === 'DESIGNATION_REJECTED' && i.schoolId === schoolId);
    expect(item?.notice).toMatchObject({ status: 'EN_COLA', deliveryEnabled: false, canResend: false });
  });

  it('el reenvío responde 409 DELIVERY_DISABLED con la causa y el siguiente paso, y no crea ningún intento', async () => {
    if (!dbUp) return;
    const before = await prisma.declineNoticeAttempt.count({ where: { assignment: { schoolId } } });

    const res = await call('POST', `/api/schools/${schoolId}/cycle-tutors/1/decline-notice/resend`, coordToken, { operationId: '00000000-0000-4000-8000-000000000001', confirmPrevious: { attemptId: null } });

    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.code).toBe('DELIVERY_DISABLED');
    expect(body.error).toMatch(/no está configurado/);
    expect(body.error).toMatch(/pida a la administración que lo configure/);
    expect(await prisma.declineNoticeAttempt.count({ where: { assignment: { schoolId } } })).toBe(before);
    expect(mockMail.sent).toBe(0);
  });
});
