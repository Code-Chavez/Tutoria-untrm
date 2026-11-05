import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaDataRequestRepository } from '../../src/infrastructure/repositories/PrismaDataRequestRepository';
import { DataRequestInFlightError, DuplicateDataRequestError, SendDataRequestUseCase } from '../../src/application/use-cases/data-requests/DataRequestUseCases';
import { DATA_REQUEST_ATTEMPT_MARGIN_MS } from '../../src/application/use-cases/data-requests/dataRequestPolicy';
import { OperationIdTakenError } from '../../src/domain/repositories/DataRequestRepository';
import { Mailer, MailSendError } from '../../src/application/ports/Mailer';
import { ownUser, removeOwnUserTraces } from '../helpers/ownUsers';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';

/**
 * LEV-R04 contra la base real de pruebas: dos solicitudes simultáneas no duplican registro ni envío (candado por clave de
 * equivalencia), la restricción única del identificador de operación, y el resultado tardío que no pisa un INCIERTO. El correo es
 * una simulación (nunca se envía nada). Datos PROPIOS (escuela, periodo y cuentas); se borran al terminar. Se omite sin base de
 * datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const stamp = String(Date.now());
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('pedidos de lista: idempotencia y equivalencia en la base real', () => {
  let dbUp = false;
  let schoolId = '';
  let periodId = '';
  let userA = '';
  let userB = '';
  const repo = new PrismaDataRequestRepository(prisma);
  const sent: string[] = [];
  let mailDelayMs = 40;
  let nextMailError: unknown;

  const mailer: Mailer = {
    send: async (message) => {
      await new Promise((resolve) => setTimeout(resolve, mailDelayMs));
      if (nextMailError) {
        const error = nextMailError;
        nextMailError = undefined;
        throw error;
      }
      sent.push(message.subject);
    },
  };

  const send = (requesterId: string) => {
    const useCase = new SendDataRequestUseCase(
      { assertSchoolAccess: async () => undefined, scopeFor: async () => ({ kind: 'ALL' }) } as never,
      { findActive: async () => ({ id: periodId, name: `Periodo propio ${stamp}` }) } as never,
      { findById: async () => ({ id: schoolId, name: `Escuela propia ${stamp}`, facultyId: 'f', cycleCount: 10, requestEmail: 'registros@example.com' }) } as never,
      { findAll: async () => [] } as never,
      { findById: async (id: string) => ({ id, email: `${id}@untrm.edu.pe`, firstName: 'Ana', lastName: 'Prueba' }) } as never,
      mailer,
      { build: async () => Buffer.from('x') },
      repo,
      { create: async () => ({}) } as never,
    );
    return (input: Record<string, unknown>) => useCase.execute(requesterId, input as never) as Promise<{ request: { id: string; status: string }; replayed: boolean }>;
  };

  const rowsOfSchool = () => prisma.dataRequest.findMany({ where: { schoolId } });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de pedidos de lista.');
      return;
    }
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    schoolId = (await prisma.school.create({ data: { name: `Escuela pedidos ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId } })).id;
    periodId = (
      await prisma.academicPeriod.create({
        data: { name: `Periodo pedidos ${stamp}`, startDate: new Date('2000-01-01'), endDate: new Date('2000-06-30'), isActive: false, createdAt: TEST_PERIOD_CREATED_AT },
      })
    ).id;
    userA = await ownUser(prisma, { email: `pedidos-a-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Ana', lastName: 'A' });
    userB = await ownUser(prisma, { email: `pedidos-b-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Beto', lastName: 'B' });
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.dataRequest.updateMany({ where: { schoolId }, data: { resendOfId: null } });
      await prisma.dataRequest.deleteMany({ where: { schoolId } });
      await removeOwnUserTraces(prisma, [userA, userB].filter(Boolean), [schoolId]);
      await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
      await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    await prisma.$disconnect();
  });

  it('dos solicitudes simultáneas equivalentes: una fila, un correo y la otra bloqueada (8 rondas)', async () => {
    if (!dbUp) return;
    for (let round = 1; round <= 8; round += 1) {
      const before = sent.length;
      const results = await Promise.allSettled([send(userA)({ schoolId, cycles: [round], operationId: uuid(round * 10) }), send(userB)({ schoolId, cycles: [round], operationId: uuid(round * 10 + 1) })]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      // La segunda ve el envío en curso o, si la primera ya terminó, el pedido ya enviado: en ambos casos no envía ni guarda nada.
      const reason = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;
      expect(reason instanceof DataRequestInFlightError || reason instanceof DuplicateDataRequestError).toBe(true);
      expect(sent.length - before).toBe(1);
      expect(await prisma.dataRequest.count({ where: { schoolId, equivalenceKey: { endsWith: `|${round}` } } })).toBe(1);
    }
  });

  it('dos solicitudes simultáneas con el mismo identificador: una fila y un correo; la otra es una repetición', async () => {
    if (!dbUp) return;
    const before = sent.length;
    const op = uuid(9001);

    const [a, b] = await Promise.all([send(userA)({ schoolId, cycles: [9], operationId: op }), send(userA)({ schoolId, cycles: [9], operationId: op })]);

    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
    expect(a.request.id).toBe(b.request.id);
    expect(sent.length - before).toBe(1);
    expect(await prisma.dataRequest.count({ where: { operationId: op } })).toBe(1);
  });

  it('un reenvío confirmado es una operación nueva; repetirlo no lo duplica; una confirmación obsoleta no vale', async () => {
    if (!dbUp) return;
    mailDelayMs = 1;
    const first = await send(userA)({ schoolId, cycles: [2, 4], operationId: uuid(9101) });
    await expect(send(userA)({ schoolId, cycles: [4, 2], operationId: uuid(9102) })).rejects.toBeInstanceOf(DuplicateDataRequestError);

    const confirm = { schoolId, cycles: [2, 4], operationId: uuid(9102), confirmDuplicateOf: first.request.id };
    const resend = await send(userA)(confirm);
    const again = await send(userA)(confirm);

    expect(resend.replayed).toBe(false);
    expect(again).toMatchObject({ replayed: true, request: { id: resend.request.id } });
    expect((await prisma.dataRequest.findUniqueOrThrow({ where: { id: resend.request.id } })).resendOfId).toBe(first.request.id);
    // Con un equivalente más reciente (el reenvío), confirmar el primero ya no sirve.
    await expect(send(userA)({ schoolId, cycles: [2, 4], operationId: uuid(9103), confirmDuplicateOf: first.request.id })).rejects.toBeInstanceOf(DuplicateDataRequestError);
    mailDelayMs = 40;
  });

  it('un fallo demostrado (FALLIDO) permite reintentar sin confirmar; uno incierto no', async () => {
    if (!dbUp) return;
    mailDelayMs = 1;
    nextMailError = new MailSendError('rechazado', 'NOT_ACCEPTED');
    const failed = await send(userA)({ schoolId, cycles: [1, 2], operationId: uuid(9201) });
    expect(failed.request.status).toBe('FALLIDO');
    const retry = await send(userA)({ schoolId, cycles: [1, 2], operationId: uuid(9202) });
    expect(retry.request.status).toBe('ENVIADO');

    nextMailError = Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
    const uncertain = await send(userA)({ schoolId, cycles: [1, 3], operationId: uuid(9203) });
    expect(uncertain.request.status).toBe('INCIERTO');
    await expect(send(userA)({ schoolId, cycles: [1, 3], operationId: uuid(9204) })).rejects.toBeInstanceOf(DuplicateDataRequestError);
    mailDelayMs = 40;
  });

  it('el identificador de operación es único por persona: la misma persona no lo repite, otra sí puede usar el mismo valor', async () => {
    if (!dbUp) return;
    const data = (requestedById: string, operationId: string) => ({ periodId, schoolId, kind: 'ESTUDIANTES' as const, toEmail: 'x@example.com', cycles: [11], note: null, requestedById, operationId, contentHash: 'h', equivalenceKey: `k|${operationId}`, resendOfId: null, attemptStartedAt: new Date() });

    await repo.reserve('unicidad', (tx) => tx.insertPending(data(userA, uuid(9301))));
    await expect(repo.reserve('unicidad-2', (tx) => tx.insertPending(data(userA, uuid(9301))))).rejects.toBeInstanceOf(OperationIdTakenError);
    await expect(repo.reserve('unicidad-3', (tx) => tx.insertPending(data(userB, uuid(9301))))).resolves.toMatchObject({ requestedById: userB });
  });

  it('un resultado tardío no pisa un INCIERTO ni un intento ajeno; uno vigente sí se registra', async () => {
    if (!dbUp) return;
    const started = new Date();
    const row = await repo.reserve('tardio', (tx) => tx.insertPending({ periodId, schoolId, kind: 'ESTUDIANTES', toEmail: 'x@example.com', cycles: [12], note: null, requestedById: userA, operationId: uuid(9401), contentHash: 'h', equivalenceKey: 'k|tardio', resendOfId: null, attemptStartedAt: started }));
    const notBefore = new Date(started.getTime() - DATA_REQUEST_ATTEMPT_MARGIN_MS);

    // Otro intento (otra marca de inicio) no la modifica.
    expect(await repo.finishAttempt(row.id, new Date(started.getTime() + 1), { status: 'ENVIADO', error: null }, notBefore)).toBeNull();
    // Vencido el margen (notBefore posterior al inicio) tampoco.
    expect(await repo.finishAttempt(row.id, started, { status: 'ENVIADO', error: null }, new Date(started.getTime() + 1))).toBeNull();
    expect((await repo.findById(row.id))?.status).toBe('PENDIENTE');
    // Marcada INCIERTO, un resultado posterior no la cambia.
    await repo.reserve('tardio', (tx) => tx.expireStalePending('k|tardio', new Date(started.getTime() + 1000)));
    expect((await repo.findById(row.id))?.status).toBe('INCIERTO');
    expect(await repo.finishAttempt(row.id, started, { status: 'ENVIADO', error: null }, notBefore)).toBeNull();
    expect((await repo.findById(row.id))?.status).toBe('INCIERTO');

    // Uno vigente sí se registra.
    const live = await repo.reserve('vigente', (tx) => tx.insertPending({ periodId, schoolId, kind: 'ESTUDIANTES', toEmail: 'x@example.com', cycles: [13], note: null, requestedById: userA, operationId: uuid(9402), contentHash: 'h', equivalenceKey: 'k|vigente', resendOfId: null, attemptStartedAt: started }));
    expect((await repo.finishAttempt(live.id, started, { status: 'ENVIADO', error: null }, notBefore))?.status).toBe('ENVIADO');
  });

  it('los pedidos históricos (sin identificador ni clave) conviven: pueden ser varios, no cuentan como equivalentes y conservan su estado', async () => {
    if (!dbUp) return;
    const legacy = () => prisma.dataRequest.create({ data: { periodId, schoolId, kind: 'ESTUDIANTES', toEmail: 'x@example.com', cycles: [1, 5], requestedById: userA, status: 'ENVIADO' } });
    const [one, two] = [await legacy(), await legacy()];

    expect(one.operationId).toBeNull();
    expect(one.equivalenceKey).toBeNull();
    expect(one.resendOfId).toBeNull();
    expect([one.status, two.status]).toEqual(['ENVIADO', 'ENVIADO']);
    mailDelayMs = 1;
    const fresh = await send(userA)({ schoolId, cycles: [1, 5], operationId: uuid(9501) });
    expect(fresh.request.status).toBe('ENVIADO');
    mailDelayMs = 40;
    expect((await rowsOfSchool()).length).toBeGreaterThan(5);
  });
});
