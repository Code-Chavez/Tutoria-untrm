import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaCycleTutorRepository } from '../../src/infrastructure/repositories/PrismaCycleTutorRepository';
import { PrismaDeclineNoticeRepository } from '../../src/infrastructure/repositories/PrismaDeclineNoticeRepository';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { PrismaSchoolRepository } from '../../src/infrastructure/repositories/PrismaSchoolRepository';
import { PrismaAcademicPeriodRepository } from '../../src/infrastructure/repositories/PrismaAcademicPeriodRepository';
import { PrismaAuditLogRepository } from '../../src/infrastructure/repositories/PrismaAuditLogRepository';
import { DECLINE_NOTICE_ATTEMPT_MARGIN_MS, DeclineNoticeProcessor } from '../../src/application/use-cases/cycle-tutors/DeclineNoticeProcessor';
import { DeclineNoticeInFlightError, ResendDeclineNoticeUseCase } from '../../src/application/use-cases/cycle-tutors/ResendDeclineNoticeUseCase';
import { Mailer, MailSendError } from '../../src/application/ports/Mailer';
import { ownUser, removeOwnUserTraces } from '../helpers/ownUsers';
import { currentPeriodId } from '../helpers/currentPeriod';

/**
 * LEV-R05 contra la base real de pruebas: el rechazo y su aviso EN_COLA son atómicos; el intento inmediato y varios procesadores a
 * la vez envían una sola vez (reserva atómica); tras un «reinicio» se recupera lo EN_COLA y lo iniciado sin resultado queda
 * INCIERTO sin repetirse; reenvíos con identidad de operación; rechazos históricos sin resultado atribuido. El correo es una
 * simulación (nunca se envía nada). Datos PROPIOS (escuela, cuentas y designaciones); se borran al terminar. Se omite sin base de
 * datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const RESPONDED = new Date('2026-10-28T10:00:00Z');
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('aviso del rechazo del docente en la base real', () => {
  let dbUp = false;
  let schoolId = '';
  let periodId = '';
  let coordId = '';
  let tutorId = '';
  let otherUserId = '';
  const notices = new PrismaDeclineNoticeRepository(prisma);
  const sent: string[] = [];
  let mailDelayMs = 30;
  let nextMailError: unknown;
  let clock = new Date();

  const mailer: Mailer = {
    send: async (message) => {
      await new Promise((resolve) => setTimeout(resolve, mailDelayMs));
      if (nextMailError) {
        const error = nextMailError;
        nextMailError = undefined;
        throw error;
      }
      sent.push(message.to);
    },
  };
  const processor = (enabled = true) =>
    new DeclineNoticeProcessor(notices, new PrismaCycleTutorRepository(prisma), new PrismaUserRepository(prisma), new PrismaSchoolRepository(prisma), new PrismaAcademicPeriodRepository(prisma), mailer, new PrismaAuditLogRepository(prisma), enabled, () => clock, 60_000, { warn: () => undefined, error: () => undefined });
  const resendCase = () =>
    new ResendDeclineNoticeUseCase(
      { assertSchoolAccess: async () => undefined } as never,
      new PrismaAcademicPeriodRepository(prisma),
      new PrismaSchoolRepository(prisma),
      new PrismaUserRepository(prisma),
      new PrismaCycleTutorRepository(prisma),
      notices,
      processor(),
      new PrismaAuditLogRepository(prisma),
      () => clock,
    );

  /** Una designación propia (un ciclo distinto por caso) ya rechazada por el docente, con su aviso EN_COLA. */
  let nextCycle = 0;
  const rejected = async () => {
    nextCycle += 1;
    const a = await prisma.cycleTutorAssignment.create({ data: { periodId, schoolId, cycle: nextCycle, tutorId, assignedById: coordId, acceptanceStatus: 'PENDIENTE' } });
    const attempt = await notices.recordDecline(a.id, tutorId, 'Licencia por estudios', RESPONDED);
    return { assignmentId: a.id, cycle: nextCycle, attemptId: attempt.id };
  };
  const summary = async (assignmentId: string) => (await prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).declineNoticeStatus;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba del aviso de rechazo.');
      return;
    }
    periodId = await currentPeriodId(prisma);
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    coordId = await ownUser(prisma, { email: `aviso-coord-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Rosa', lastName: 'Aviso' });
    otherUserId = await ownUser(prisma, { email: `aviso-otro-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Beto', lastName: 'Aviso' });
    schoolId = (await prisma.school.create({ data: { name: `Escuela aviso ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId, coordinatorId: coordId } })).id;
    tutorId = await ownUser(prisma, { email: `aviso-docente-${stamp}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Ana', lastName: 'Docente', schoolId });
  });

  beforeEach(() => {
    clock = new Date();
    mailDelayMs = 30;
    nextMailError = undefined;
  });

  afterAll(async () => {
    if (dbUp) {
      const assignmentIds = (await prisma.cycleTutorAssignment.findMany({ where: { schoolId }, select: { id: true } })).map((a) => a.id);
      await prisma.declineNoticeAttempt.updateMany({ where: { assignmentId: { in: assignmentIds } }, data: { previousAttemptId: null } });
      await prisma.cycleTutorAssignment.deleteMany({ where: { schoolId } });
      await removeOwnUserTraces(prisma, [coordId, tutorId, otherUserId].filter(Boolean), [schoolId, ...assignmentIds]);
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: null } });
      await prisma.user.deleteMany({ where: { id: { in: [coordId, tutorId, otherUserId].filter(Boolean) } } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    await prisma.$disconnect();
  });

  it('el rechazo y su aviso EN_COLA se guardan en una sola operación atómica; sin la designación no queda ningún intento huérfano', async () => {
    if (!dbUp) return;
    const { assignmentId, attemptId } = await rejected();

    const a = await prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    expect(a).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineReason: 'Licencia por estudios', declineNoticeStatus: 'EN_COLA', declineNoticeAttemptId: attemptId });
    expect(await prisma.declineNoticeAttempt.findUniqueOrThrow({ where: { id: attemptId } })).toMatchObject({ kind: 'ORIGINAL', status: 'EN_COLA', tutorId, startedAt: null });

    const before = await prisma.declineNoticeAttempt.count();
    await expect(notices.recordDecline(uuid(1), tutorId, 'x', RESPONDED)).rejects.toThrow();
    expect(await prisma.declineNoticeAttempt.count()).toBe(before);
  });

  it('el intento inmediato y varios procesadores a la vez envían una sola vez (8 rondas)', async () => {
    if (!dbUp) return;
    // Lo EN_COLA de casos anteriores se entrega antes, para contar solo los envíos de cada ronda.
    await processor().processDue(500);
    for (let round = 0; round < 8; round += 1) {
      const { assignmentId, attemptId } = await rejected();
      const before = sent.length;
      const [p1, p2, p3] = [processor(), processor(), processor()];

      await Promise.all([p1.attempt(attemptId), p2.attempt(attemptId), p3.processDue(50), p1.processDue(50)]);

      expect(sent.length - before).toBe(1);
      expect(await summary(assignmentId)).toBe('ENVIADO');
      expect(await prisma.auditLog.count({ where: { entityId: assignmentId, action: 'CYCLE_TUTOR_DECLINE_NOTICE_RESULT' } })).toBe(1);
    }
  });

  it('tras un reinicio se recupera lo EN_COLA que nunca se intentó; lo iniciado sin resultado queda INCIERTO y no se repite', async () => {
    if (!dbUp) return;
    const queued = await rejected();
    const crashed = await rejected();
    const before = sent.length;
    // El proceso murió justo después de empezar este intento: está ENVIANDO y no hay resultado.
    const claimed = await notices.claim(crashed.attemptId, clock);
    expect(claimed?.status).toBe('ENVIANDO');
    clock = new Date(clock.getTime() + DECLINE_NOTICE_ATTEMPT_MARGIN_MS + 1000);

    // «Reinicio»: un procesador nuevo, sin memoria; solo está lo guardado.
    await processor().processDue(50);
    await processor().processDue(50);

    expect(await summary(queued.assignmentId)).toBe('ENVIADO');
    expect(await summary(crashed.assignmentId)).toBe('INCIERTO');
    expect(sent.length - before).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: crashed.assignmentId, action: 'CYCLE_TUTOR_DECLINE_NOTICE_RESULT' } })).toBe(1);
  });

  it('sin envío habilitado el aviso se conserva EN_COLA y no se intenta; al habilitarse sale', async () => {
    if (!dbUp) return;
    const { assignmentId, attemptId } = await rejected();
    const before = sent.length;

    expect(await processor(false).attempt(attemptId)).toBeNull();
    expect(await processor(false).processDue(50)).toBe(0);
    expect(await summary(assignmentId)).toBe('EN_COLA');
    expect(sent.length).toBe(before);

    await processor(true).processDue(50);
    expect(await summary(assignmentId)).toBe('ENVIADO');
  });

  it('resultados: fallo demostrado FALLIDO y corte durante DATA INCIERTO; ninguno se reintenta solo', async () => {
    if (!dbUp) return;
    const failed = await rejected();
    nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
    await processor().attempt(failed.attemptId);
    const uncertain = await rejected();
    nextMailError = Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
    await processor().attempt(uncertain.attemptId);
    const before = sent.length;
    clock = new Date(clock.getTime() + DECLINE_NOTICE_ATTEMPT_MARGIN_MS * 3);

    await processor().processDue(50);

    expect(await summary(failed.assignmentId)).toBe('FALLIDO');
    expect(await summary(uncertain.assignmentId)).toBe('INCIERTO');
    expect(sent.length).toBe(before);
  });

  it('un trabajo obsoleto no se envía: si la designación pasó a otro docente, queda OBSOLETO', async () => {
    if (!dbUp) return;
    const { assignmentId, attemptId } = await rejected();
    await prisma.cycleTutorAssignment.update({ where: { id: assignmentId }, data: { acceptanceStatus: 'SIN_SOLICITAR', respondedAt: null, declineReason: null } });
    const before = sent.length;

    await processor().attempt(attemptId);

    expect(await summary(assignmentId)).toBe('OBSOLETO');
    expect(sent.length).toBe(before);
  });

  it('un resultado tardío no pisa un INCIERTO (actualización condicional)', async () => {
    if (!dbUp) return;
    const { attemptId } = await rejected();
    const started = new Date();
    await notices.claim(attemptId, started);

    expect(await notices.finish(attemptId, new Date(started.getTime() + 1), { status: 'ENVIADO', errorCode: null }, new Date(), new Date(started.getTime() - 1000))).toBeNull();
    expect(await notices.finish(attemptId, started, { status: 'ENVIADO', errorCode: null }, new Date(), new Date(started.getTime() + 1))).toBeNull();
    await notices.expireStale(new Date(started.getTime() + 1000));
    expect((await notices.findById(attemptId))?.status).toBe('INCIERTO');
    expect(await notices.finish(attemptId, started, { status: 'ENVIADO', errorCode: null }, new Date(), new Date(started.getTime() - 1000))).toBeNull();
    expect((await notices.findById(attemptId))?.status).toBe('INCIERTO');
  });

  describe('reenvío', () => {
    it('dos reenvíos simultáneos con distinto identificador: uno envía y el otro queda bloqueado; un solo correo y un solo intento nuevo', async () => {
      if (!dbUp) return;
      const { assignmentId, attemptId, cycle } = await rejected();
      nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
      await processor().attempt(attemptId);
      const before = sent.length;

      const results = await Promise.allSettled([resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(101) }), resendCase().execute(otherUserId, schoolId, cycle, { operationId: uuid(102) })]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason).toBeInstanceOf(DeclineNoticeInFlightError);
      expect(sent.length - before).toBe(1);
      expect(await prisma.declineNoticeAttempt.count({ where: { assignmentId, kind: 'REENVIO' } })).toBe(1);
    });

    it('repetir la operación (misma persona e identificador), también en paralelo, no envía otra vez ni crea otro intento', async () => {
      if (!dbUp) return;
      const { assignmentId, attemptId, cycle } = await rejected();
      nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
      await processor().attempt(attemptId);
      const before = sent.length;

      const [a, b] = await Promise.all([resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(201) }), resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(201) })]);
      const c = await resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(201) });

      expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
      expect(c.replayed).toBe(true);
      expect(sent.length - before).toBe(1);
      expect(await prisma.declineNoticeAttempt.count({ where: { assignmentId, kind: 'REENVIO' } })).toBe(1);
    });

    it('un reenvío incierto repetido con el mismo identificador no se reintenta; confirmar el intento mostrado crea otro; una confirmación antigua no vale', async () => {
      if (!dbUp) return;
      const { attemptId, cycle } = await rejected();
      nextMailError = Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
      await processor().attempt(attemptId);

      await expect(resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(301) })).rejects.toThrow(/No se puede saber si el aviso anterior salió/);
      const before = sent.length;
      nextMailError = Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
      const second = await resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(302), confirmPrevious: { attemptId } });
      expect(second.attempt.status).toBe('INCIERTO');

      const again = await resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(302), confirmPrevious: { attemptId } });
      expect(again).toMatchObject({ replayed: true, attempt: { id: second.attempt.id, status: 'INCIERTO' } });
      await expect(resendCase().execute(coordId, schoolId, cycle, { operationId: uuid(303), confirmPrevious: { attemptId } })).rejects.toThrow(/No se puede saber si el aviso anterior salió/);
      expect(sent.length).toBe(before);
    });

    it('el identificador es único por persona: otra persona puede usar el mismo valor sin ver el intento ajeno', async () => {
      if (!dbUp) return;
      const a = await rejected();
      const b = await rejected();
      nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
      await processor().attempt(a.attemptId);
      nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
      await processor().attempt(b.attemptId);

      const mine = await resendCase().execute(coordId, schoolId, a.cycle, { operationId: uuid(401) });
      const theirs = await resendCase().execute(otherUserId, schoolId, b.cycle, { operationId: uuid(401) });

      expect(mine.replayed).toBe(false);
      expect(theirs.replayed).toBe(false);
      expect(theirs.attempt.id).not.toBe(mine.attempt.id);
    });

    it('un rechazo anterior a la función (sin ningún intento) conserva «sin registro»: no se le atribuye un resultado; exige confirmar y deja constancia', async () => {
      if (!dbUp) return;
      nextCycle += 1;
      const legacy = await prisma.cycleTutorAssignment.create({
        data: { periodId, schoolId, cycle: nextCycle, tutorId, assignedById: coordId, acceptanceStatus: 'RECHAZADA', respondedAt: RESPONDED, declineReason: 'Rechazo antiguo' },
      });
      expect(legacy.declineNoticeStatus).toBeNull();
      expect(legacy.declineNoticeAttemptId).toBeNull();
      expect(await prisma.declineNoticeAttempt.count({ where: { assignmentId: legacy.id } })).toBe(0);

      await expect(resendCase().execute(coordId, schoolId, nextCycle, { operationId: uuid(501) })).rejects.toThrow(/No se puede saber si el aviso anterior salió/);
      const result = await resendCase().execute(coordId, schoolId, nextCycle, { operationId: uuid(501), confirmPrevious: { attemptId: null } });

      expect(result.attempt).toMatchObject({ status: 'ENVIADO', reason: 'SIN_REGISTRO_PREVIO', previousAttemptId: null });
      expect(await prisma.cycleTutorAssignment.findUniqueOrThrow({ where: { id: legacy.id } })).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineReason: 'Rechazo antiguo' });
    });
  });

  it('varios avisos originales conviven (identificador de operación nulo): la restricción única solo aplica a los reenvíos', async () => {
    if (!dbUp) return;
    await rejected();
    await rejected();

    expect(await prisma.declineNoticeAttempt.count({ where: { assignment: { schoolId }, operationId: null } })).toBeGreaterThanOrEqual(2);
  });
});
