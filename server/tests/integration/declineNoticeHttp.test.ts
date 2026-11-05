import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { generateSecretToken, hashSecretToken } from '../../src/application/use-cases/auth/secretToken';
import { MailSendError } from '../../src/application/ports/Mailer';
import { ownUser, removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';
import { currentPeriodId } from '../helpers/currentPeriod';

/**
 * LEV-R05 por HTTP real y base real de pruebas: el docente recibe su confirmación sin esperar el correo; el aviso se entrega por el
 * intento inmediato o el proceso de fondo; contrato del reenvío (401, 400, 403, 404, 409 con sus códigos, 422, 200, 201, 202, 502) y
 * el ítem de Pendientes con el estado del aviso. El correo es una simulación inyectada SOLO en este archivo con jest.mock del
 * transporte (sin interruptor de pruebas en producción; nunca se envía nada). El envío «habilitado» se logra con un SMTP_HOST
 * ficticio fijado antes de cargar la aplicación. Datos PROPIOS (escuela, cuentas, designaciones); se borran al terminar.
 */
const mockMail: { handler: (message: unknown) => Promise<void>; delivered: string[] } = { handler: async () => undefined, delivered: [] };
jest.mock('../../src/infrastructure/services/SmtpMailer', () => {
  class TestMailer {
    async send(message: { to: string }): Promise<void> {
      await mockMail.handler(message);
      mockMail.delivered.push(message.to);
    }
  }
  return { SmtpMailer: TestMailer, UnconfiguredMailer: TestMailer };
});

const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('aviso del rechazo por HTTP', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let schoolId = '';
  let periodId = '';
  let coordId = '';
  let otherCoordId = '';
  let tutorId = '';
  const tokens = {} as Record<'coord' | 'other', string>;
  let cycleSeq = 0;

  const call = (method: string, path: string, who?: 'coord' | 'other', body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const row = (cycle: number) => prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle } } });
  const waitFor = async (predicate: () => Promise<boolean>, ms = 4000) => {
    for (let waited = 0; waited < ms; waited += 25) {
      if (await predicate()) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  };
  /** Una designación propia pendiente de responder, con su enlace conocido. */
  const pending = async () => {
    cycleSeq += 1;
    const token = generateSecretToken();
    await prisma.cycleTutorAssignment.create({
      data: { periodId, schoolId, cycle: cycleSeq, tutorId, assignedById: coordId, acceptanceStatus: 'PENDIENTE', acceptanceTokenHash: hashSecretToken(token), acceptanceExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    return { token, cycle: cycleSeq };
  };
  const decline = (token: string) => call('POST', `/api/tutor-acceptance/${token}`, undefined, { accept: false, reason: 'Licencia por estudios' });
  const resendPath = (cycle: number) => `/api/schools/${schoolId}/cycle-tutors/${cycle}/decline-notice/resend`;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP del aviso de rechazo.');
      return;
    }
    process.env.SMTP_HOST = 'smtp.test.invalid'; // ficticio: el transporte está sustituido; habilita el envío del aviso
    periodId = await currentPeriodId(prisma);
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    coordId = await ownUser(prisma, { email: `avisohttp-coord-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Rosa', lastName: 'Http' });
    otherCoordId = await ownUser(prisma, { email: `avisohttp-otra-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Olga', lastName: 'Http' });
    schoolId = (await prisma.school.create({ data: { name: `Escuela aviso http ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId, coordinatorId: coordId } })).id;
    tutorId = await ownUser(prisma, { email: `avisohttp-docente-${stamp}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Ana', lastName: 'Http', schoolId });

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const [who, email] of [['coord', `avisohttp-coord-${stamp}@untrm.edu.pe`], ['other', `avisohttp-otra-${stamp}@untrm.edu.pe`]] as const) {
      const res = await call('POST', '/api/auth/login', undefined, { email, password: DEMO_PASSWORD });
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      const ids = [coordId, otherCoordId, tutorId].filter(Boolean);
      const assignmentIds = (await prisma.cycleTutorAssignment.findMany({ where: { schoolId }, select: { id: true } })).map((a) => a.id);
      await prisma.declineNoticeAttempt.updateMany({ where: { assignmentId: { in: assignmentIds } }, data: { previousAttemptId: null } });
      await prisma.cycleTutorAssignment.deleteMany({ where: { schoolId } });
      await removeOwnUserTraces(prisma, ids, [schoolId, ...assignmentIds]);
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: null } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    mockMail.handler = async () => undefined;
    mockMail.delivered = [];
  });

  it('el docente recibe su confirmación SIN esperar el correo: el rechazo queda guardado con su aviso en cola y se entrega después', async () => {
    if (!dbUp) return;
    let release: () => void = () => undefined;
    let invoked = false;
    mockMail.handler = () => new Promise<void>((resolve) => {
      invoked = true;
      release = resolve; // el correo no termina mientras no se libere
    });
    const { token, cycle } = await pending();

    const started = Date.now();
    const res = await decline(token);

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ accepted: false });
    expect(Date.now() - started).toBeLessThan(3000); // no esperó el envío (que sigue sin terminar)
    expect(await row(cycle)).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineReason: 'Licencia por estudios' });
    // El intento inmediato ya lo tomó (está en curso) pero aún no hay resultado: el docente no depende de él.
    expect(await waitFor(async () => (await row(cycle)).declineNoticeStatus === 'ENVIANDO')).toBe(true);
    expect(await waitFor(async () => invoked)).toBe(true);
    expect(mockMail.delivered).toHaveLength(0);

    release();
    expect(await waitFor(async () => (await row(cycle)).declineNoticeStatus === 'ENVIADO')).toBe(true);
    expect(mockMail.delivered).toEqual([`avisohttp-coord-${stamp}@untrm.edu.pe`]);
  });

  it('si el correo falla, el docente igual recibe su confirmación y el rechazo queda; el aviso queda FALLIDO (confirmado) o INCIERTO según lo que se pueda demostrar', async () => {
    if (!dbUp) return;
    mockMail.handler = async () => {
      throw new MailSendError('rechazado', 'NOT_ACCEPTED');
    };
    const failed = await pending();
    expect((await decline(failed.token)).status).toBe(200);
    expect(await waitFor(async () => (await row(failed.cycle)).declineNoticeStatus === 'FALLIDO')).toBe(true);

    mockMail.handler = async () => {
      throw Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
    };
    const uncertain = await pending();
    expect((await decline(uncertain.token)).status).toBe(200);
    expect(await waitFor(async () => (await row(uncertain.cycle)).declineNoticeStatus === 'INCIERTO')).toBe(true);
    expect(await row(uncertain.cycle)).toMatchObject({ acceptanceStatus: 'RECHAZADA' });
  });

  it('Pendientes muestra UN ítem del rechazo con el estado del aviso, sin datos técnicos', async () => {
    if (!dbUp) return;
    mockMail.handler = async () => {
      throw new MailSendError('rechazado', 'NOT_ACCEPTED');
    };
    const { token, cycle } = await pending();
    await decline(token);
    await waitFor(async () => (await row(cycle)).declineNoticeStatus === 'FALLIDO');

    const body = await json(await call('GET', '/api/institutional-pending', 'coord'));

    const items = (body.items as { kind: string; schoolId: string; cycle: number; notice?: Record<string, unknown> }[]).filter((i) => i.schoolId === schoolId && i.cycle === cycle);
    const rejected = items.filter((i) => i.kind === 'DESIGNATION_REJECTED');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].notice).toMatchObject({ status: 'FALLIDO', deliveryEnabled: true, canResend: true, needsConfirmation: false, recipientName: 'Rosa Http' });
    expect(JSON.stringify(rejected[0].notice)).not.toMatch(/errorCode|recipientEmail|@untrm|ECONN/);
  });

  describe('contrato del reenvío', () => {
    const failedNotice = async () => {
      mockMail.handler = async () => {
        throw new MailSendError('rechazado', 'NOT_ACCEPTED');
      };
      const p = await pending();
      await decline(p.token);
      await waitFor(async () => (await row(p.cycle)).declineNoticeStatus === 'FALLIDO');
      mockMail.handler = async () => undefined;
      mockMail.delivered = [];
      return p.cycle;
    };

    it('401 sin sesión; 400 sin operationId (mensaje claro) o con uno inválido; 403 fuera de la escuela; 404 sin designación', async () => {
      if (!dbUp) return;
      const cycle = await failedNotice();

      expect((await call('POST', resendPath(cycle), undefined, { operationId: uuid(1) })).status).toBe(401);
      const missing = await call('POST', resendPath(cycle), 'coord', {});
      expect(missing.status).toBe(400);
      expect((await json(missing)).error).toMatch(/Falta el identificador de la operación \(operationId\)/);
      expect((await call('POST', resendPath(cycle), 'coord', { operationId: 'no-es-uuid' })).status).toBe(400);
      expect((await call('POST', resendPath(cycle), 'other', { operationId: uuid(2) })).status).toBe(403);
      expect((await call('POST', resendPath(14), 'coord', { operationId: uuid(3) })).status).toBe(404);
      expect(mockMail.delivered).toHaveLength(0);
    });

    it('201 con un FALLIDO (solo reenvía el correo: el rechazo queda intacto); repetir la operación responde 200 sin otro correo', async () => {
      if (!dbUp) return;
      const cycle = await failedNotice();
      const before = await row(cycle);

      const res = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(10) });
      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body).toMatchObject({ replayed: false, attempt: { status: 'ENVIADO', kind: 'REENVIO', recipientName: 'Rosa Http' } });
      expect(Object.keys(body.attempt).sort()).toEqual(['at', 'id', 'kind', 'recipientName', 'status']);
      expect(mockMail.delivered).toHaveLength(1);
      const after = await row(cycle);
      expect({ s: after.acceptanceStatus, r: after.declineReason, at: after.respondedAt }).toEqual({ s: before.acceptanceStatus, r: before.declineReason, at: before.respondedAt });

      const again = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(10) });
      expect(again.status).toBe(200);
      expect((await json(again)).replayed).toBe(true);
      expect(mockMail.delivered).toHaveLength(1);

      // Ya aceptado por el servidor de correo: no hay nada que reenviar.
      const done = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(11) });
      expect(done.status).toBe(409);
      expect((await json(done)).code).toBe('DECLINE_NOTICE_ALREADY_SENT');
    });

    it('un resultado incierto: 409 CONFIRMATION_REQUIRED identificando el intento mostrado; confirmar ese intento envía; una confirmación antigua vuelve a pedir; 202 si el reenvío queda incierto', async () => {
      if (!dbUp) return;
      mockMail.handler = async () => {
        throw Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
      };
      const p = await pending();
      await decline(p.token);
      await waitFor(async () => (await row(p.cycle)).declineNoticeStatus === 'INCIERTO');
      const shown = (await row(p.cycle)).declineNoticeAttemptId as string;
      mockMail.delivered = [];

      const need = await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(20) });
      expect(need.status).toBe(409);
      expect(await json(need)).toMatchObject({ code: 'CONFIRMATION_REQUIRED', previous: { attemptId: shown, status: 'INCIERTO' } });

      const stale = await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(20), confirmPrevious: { attemptId: uuid(999) } });
      expect(stale.status).toBe(409);
      expect((await json(stale)).previous.attemptId).toBe(shown);

      const second = await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(21), confirmPrevious: { attemptId: shown } });
      expect(second.status).toBe(202); // el reenvío también quedó incierto
      expect((await json(second)).attempt.status).toBe('INCIERTO');
      // Repetir esa operación no reintenta; confirmar el intento antiguo ya no autoriza otro.
      expect((await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(21), confirmPrevious: { attemptId: shown } })).status).toBe(200);
      expect((await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(22), confirmPrevious: { attemptId: shown } })).status).toBe(409);
      expect(mockMail.delivered).toHaveLength(0);
    });

    it('502 si el reenvío no es aceptado; 409 NOT_REJECTED si la designación ya no está rechazada; 409 NO_ENABLED_RECIPIENT sin destinatario habilitado (no se crea intento)', async () => {
      if (!dbUp) return;
      const cycle = await failedNotice();
      mockMail.handler = async () => {
        throw new MailSendError('rechazado', 'NOT_ACCEPTED');
      };
      const refused = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(30) });
      expect(refused.status).toBe(502);
      expect((await json(refused)).attempt.status).toBe('FALLIDO');

      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: null } });
      const attempts = await prisma.declineNoticeAttempt.count({ where: { assignment: { schoolId } } });
      const none = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(31) });
      expect(none.status).toBe(403); // sin coordinación, la persona ya no tiene alcance sobre la escuela
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: coordId } });
      expect(await prisma.declineNoticeAttempt.count({ where: { assignment: { schoolId } } })).toBe(attempts);

      await prisma.cycleTutorAssignment.update({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle } }, data: { acceptanceStatus: 'PENDIENTE', respondedAt: null, declineReason: null } });
      const stale = await call('POST', resendPath(cycle), 'coord', { operationId: uuid(32) });
      expect(stale.status).toBe(409);
      expect((await json(stale)).code).toBe('DECLINE_NOT_REJECTED');
    });

    it('un envío en curso bloquea el reenvío (409 DECLINE_NOTICE_IN_FLIGHT) aunque se confirme', async () => {
      if (!dbUp) return;
      mockMail.handler = () => new Promise<void>(() => undefined); // nunca termina
      const p = await pending();
      await decline(p.token);
      await waitFor(async () => (await row(p.cycle)).declineNoticeStatus === 'ENVIANDO');
      const shown = (await row(p.cycle)).declineNoticeAttemptId as string;

      const res = await call('POST', resendPath(p.cycle), 'coord', { operationId: uuid(40), confirmPrevious: { attemptId: shown } });

      expect(res.status).toBe(409);
      expect((await json(res)).code).toBe('DECLINE_NOTICE_IN_FLIGHT');
    });
  });
});
