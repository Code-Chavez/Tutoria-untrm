import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { MailMessage, MailNotConfiguredError, MailSendError } from '../../src/application/ports/Mailer';
import { ownUser, removeOwnUserTraces, DEMO_PASSWORD } from '../helpers/ownUsers';

/**
 * LEV-R04 por HTTP real y base real de pruebas: autorización, 400/403/409/422, repeticiones, reenvío confirmado y ausencia de un
 * segundo envío. El correo es una simulación inyectada SOLO en esta prueba, sustituyendo el módulo del transporte con jest.mock:
 * no hay ningún interruptor de pruebas en el código de producción y nunca se envía nada. Datos PROPIOS: escuela, coordinadores y
 * los pedidos que crean (se borran al terminar); la cuenta administradora sembrada solo inicia sesión. Se omite sin base de datos,
 * salvo REQUIRE_DB_TESTS=1.
 */
const mockMail: { handler: (message: unknown) => Promise<void>; delivered: number } = { handler: async () => undefined, delivered: 0 };
jest.mock('../../src/infrastructure/services/SmtpMailer', () => {
  class TestMailer {
    async send(message: unknown): Promise<void> {
      await mockMail.handler(message);
      mockMail.delivered += 1;
    }
  }
  return { SmtpMailer: TestMailer, UnconfiguredMailer: TestMailer };
});

const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const NO_ACCESS_MESSAGE = /No tienes acceso a esa escuela/;

describe('pedidos de lista por HTTP: idempotencia y equivalencia', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let schoolId = '';
  let coordA = '';
  let coordB = '';
  const tokens = {} as Record<'a' | 'b' | 'admin', string>;

  const post = (who: 'a' | 'b' | 'admin' | null, body: Record<string, unknown>) =>
    fetch(`${baseUrl}/api/data-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
      body: JSON.stringify(body),
    });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = () => prisma.dataRequest.findMany({ where: { schoolId }, orderBy: { createdAt: 'asc' } });
  const login = async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };
  /** Cada caso trabaja con ciclos propios para no chocar con los pedidos equivalentes de los anteriores. */
  const ask = (cycles: number[], extra: Record<string, unknown> = {}) => ({ schoolId, cycles, ...extra });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP de pedidos de lista.');
      return;
    }
    coordA = await ownUser(prisma, { email: `ped-http-a-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Ana', lastName: 'A' });
    coordB = await ownUser(prisma, { email: `ped-http-b-${stamp}@untrm.edu.pe`, roleName: 'Coordinador', firstName: 'Beto', lastName: 'B' });
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    schoolId = (
      await prisma.school.create({ data: { name: `Escuela pedidos http ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId, coordinatorId: coordA, requestEmail: 'registros@example.com', cycleCount: 10 } })
    ).id;

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.a = await login(`ped-http-a-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.b = await login(`ped-http-b-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.dataRequest.updateMany({ where: { schoolId }, data: { resendOfId: null } });
      await prisma.dataRequest.deleteMany({ where: { schoolId } });
      await removeOwnUserTraces(prisma, [coordA, coordB].filter(Boolean), [schoolId]);
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({ where: { id: { in: [coordA, coordB].filter(Boolean) } } });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    mockMail.handler = async () => undefined;
    mockMail.delivered = 0;
  });

  it('sin sesión responde 401 y no envía nada', async () => {
    if (!dbUp) return;
    const res = await post(null, ask([1], { operationId: uuid(1) }));

    expect(res.status).toBe(401);
    expect(mockMail.delivered).toBe(0);
  });

  it('sin operationId se rechaza con 400 y un mensaje claro: el servidor no genera uno ni envía', async () => {
    if (!dbUp) return;
    const res = await post('a', ask([1]));

    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/Falta el identificador de la operación \(operationId\)/);
    expect(await rows()).toHaveLength(0);
    expect(mockMail.delivered).toBe(0);
  });

  it('un operationId que no es UUID se rechaza con 400', async () => {
    if (!dbUp) return;
    const res = await post('a', ask([1], { operationId: 'no-es-uuid' }));

    expect(res.status).toBe(400);
    expect(mockMail.delivered).toBe(0);
  });

  it('quien no tiene acceso a la escuela recibe 403, no se envía nada y reutilizar el operationId ajeno no revela datos', async () => {
    if (!dbUp) return;
    const mine = await post('a', ask([1], { operationId: uuid(10) }));
    expect(mine.status).toBe(201);

    const denied = await post('b', ask([1], { operationId: uuid(10) }));

    expect(denied.status).toBe(403);
    expect((await json(denied)).error).toMatch(NO_ACCESS_MESSAGE);
    expect(mockMail.delivered).toBe(1);
    expect(await rows()).toHaveLength(1);
  });

  it('repetir la misma operación devuelve 200 con lo guardado y no envía otro correo; con otro contenido responde 422', async () => {
    if (!dbUp) return;
    const body = ask([2], { operationId: uuid(20) });
    const first = await post('a', body);
    expect(first.status).toBe(201);
    const created = (await json(first)).request;
    const rowsBefore = (await rows()).length;
    const mailsBefore = mockMail.delivered;

    const again = await post('a', body);
    const conflict = await post('a', ask([2], { operationId: uuid(20), note: 'otra nota' }));
    const otherCycles = await post('a', ask([2, 3], { operationId: uuid(20) }));

    expect(again.status).toBe(200);
    const replay = await json(again);
    expect(replay).toMatchObject({ replayed: true, request: { id: created.id, status: 'ENVIADO' } });
    expect(conflict.status).toBe(422);
    expect((await json(conflict)).code).toBe('OPERATION_ID_CONFLICT');
    expect(otherCycles.status).toBe(422);
    expect(mockMail.delivered).toBe(mailsBefore);
    expect(await rows()).toHaveLength(rowsBefore);
  });

  it('otra persona con el mismo operationId no ve el pedido ajeno: recibe la advertencia con el resumen mínimo del equivalente', async () => {
    if (!dbUp) return;
    const mine = await post('a', ask([4], { operationId: uuid(30) }));
    expect(mine.status).toBe(201);
    const created = (await json(mine)).request;

    const theirs = await post('admin', ask([4], { operationId: uuid(30) }));

    expect(theirs.status).toBe(409);
    const body = await json(theirs);
    expect(body.code).toBe('DUPLICATE_DATA_REQUEST');
    expect(Object.keys(body.previous).sort()).toEqual(['createdAt', 'id', 'status']);
    expect(body.previous.id).toBe(created.id);
    expect(JSON.stringify(body)).not.toContain('registros@example.com');
  });

  it('un equivalente reciente responde 409 sin enviar; confirmar ESE pedido envía otra operación; repetirlo no duplica; una confirmación obsoleta vuelve a advertir', async () => {
    if (!dbUp) return;
    const first = await post('a', ask([5], { operationId: uuid(40) }));
    const firstId = (await json(first)).request.id as string;
    const mails = mockMail.delivered;

    const warned = await post('a', ask([5], { operationId: uuid(41) }));
    expect(warned.status).toBe(409);
    expect((await json(warned)).previous.id).toBe(firstId);
    expect(mockMail.delivered).toBe(mails);

    const confirm = ask([5], { operationId: uuid(42), confirmDuplicateOf: firstId });
    const resend = await post('a', confirm);
    expect(resend.status).toBe(201);
    const resendId = (await json(resend)).request.id as string;
    expect(mockMail.delivered).toBe(mails + 1);
    expect((await prisma.dataRequest.findUniqueOrThrow({ where: { id: resendId } })).resendOfId).toBe(firstId);

    const retried = await post('a', confirm);
    expect(retried.status).toBe(200);
    expect((await json(retried)).replayed).toBe(true);
    expect(mockMail.delivered).toBe(mails + 1);

    const stale = await post('a', ask([5], { operationId: uuid(43), confirmDuplicateOf: firstId }));
    expect(stale.status).toBe(409);
    expect((await json(stale)).previous.id).toBe(resendId);
    expect(mockMail.delivered).toBe(mails + 1);
  });

  it('dos peticiones simultáneas equivalentes: una se envía (201) y la otra recibe 409; un solo correo y una sola fila', async () => {
    if (!dbUp) return;
    mockMail.handler = () => new Promise((resolve) => setTimeout(resolve, 80));

    const [x, y] = await Promise.all([post('a', ask([6], { operationId: uuid(50) })), post('a', ask([6], { operationId: uuid(51) }))]);

    expect([x.status, y.status].sort()).toEqual([201, 409]);
    expect(mockMail.delivered).toBe(1);
    expect((await rows()).filter((r) => r.cycles.join() === '6')).toHaveLength(1);
  });

  it('con un envío en curso (PENDIENTE) otro equivalente recibe 409 DATA_REQUEST_IN_FLIGHT aunque lo confirme', async () => {
    if (!dbUp) return;
    let release: () => void = () => undefined;
    mockMail.handler = () => new Promise<void>((resolve) => (release = resolve));
    const inFlight = post('a', ask([7], { operationId: uuid(60) }));
    let pendingId = '';
    for (let i = 0; i < 100 && !pendingId; i += 1) {
      pendingId = (await prisma.dataRequest.findFirst({ where: { schoolId, status: 'PENDIENTE' } }))?.id ?? '';
      if (!pendingId) await new Promise((r) => setTimeout(r, 20));
    }
    expect(pendingId).not.toBe('');

    const blocked = await post('a', ask([7], { operationId: uuid(61), confirmDuplicateOf: pendingId }));

    expect(blocked.status).toBe(409);
    expect((await json(blocked)).code).toBe('DATA_REQUEST_IN_FLIGHT');
    release();
    expect((await inFlight).status).toBe(201);
    expect(mockMail.delivered).toBe(1);
  });

  it('un fallo demostrado responde 502 FALLIDO y permite reintentar sin confirmar; uno incierto responde 202 y exige confirmar', async () => {
    if (!dbUp) return;
    mockMail.handler = async () => {
      throw new MailSendError('rechazado', 'NOT_ACCEPTED');
    };
    const failed = await post('a', ask([8], { operationId: uuid(70) }));
    expect(failed.status).toBe(502);
    const failedBody = await json(failed);
    expect(failedBody.request.status).toBe('FALLIDO');
    // Sin una causa conocida no se expone ningún texto técnico: el cliente usa su mensaje general.
    expect(failedBody.request.error).toBeNull();
    expect(JSON.stringify(failedBody)).not.toMatch(/MailSendError/);

    mockMail.handler = async () => undefined;
    const retry = await post('a', ask([8], { operationId: uuid(71) }));
    expect(retry.status).toBe(201);

    mockMail.handler = async (_m: MailMessage | unknown) => {
      throw Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' });
    };
    const uncertain = await post('a', ask([9], { operationId: uuid(72) }));
    expect(uncertain.status).toBe(202);
    const uncertainBody = await json(uncertain);
    expect(uncertainBody.request.status).toBe('INCIERTO');
    // Un resultado incierto nunca expone el nombre del error ni sugiere una causa: no se sabe si el correo salió.
    expect(uncertainBody.request.error).toBeNull();
    expect(JSON.stringify(uncertainBody)).not.toMatch(/Error|ESOCKET|corte/);

    mockMail.handler = async () => undefined;
    const warned = await post('a', ask([9], { operationId: uuid(73) }));
    expect(warned.status).toBe(409);
    expect((await json(warned)).previous.status).toBe('INCIERTO');
    // Repetir la operación incierta no la reintenta.
    const again = await post('a', ask([9], { operationId: uuid(72) }));
    expect(again.status).toBe(200);
    expect((await json(again)).request.status).toBe('INCIERTO');
  });

  it('si el correo no está configurado, la respuesta y el historial explican la causa sin el nombre interno del error, que queda en el registro del servidor', async () => {
    if (!dbUp) return;
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      mockMail.handler = async () => {
        throw new MailNotConfiguredError();
      };
      const res = await post('a', ask([10], { operationId: uuid(80) }));
      expect(res.status).toBe(502);
      const body = await json(res);
      expect(body.request.status).toBe('FALLIDO');
      expect(body.request.error).toBe('El envío de correo no está configurado en el sistema');
      expect(JSON.stringify(body)).not.toMatch(/MailNotConfiguredError/);

      const list = await fetch(`${baseUrl}/api/data-requests`, { headers: { Authorization: `Bearer ${tokens.a}` } });
      expect(JSON.stringify(await json(list))).not.toMatch(/MailNotConfiguredError/);

      // El detalle técnico sí queda en el registro del servidor y en la base (diagnóstico).
      expect(logged).toHaveBeenCalledWith('[pedido de listas] el correo no salió', expect.objectContaining({ reason: 'MailNotConfiguredError', status: 'FALLIDO' }));
      expect((await prisma.dataRequest.findUniqueOrThrow({ where: { id: body.request.id } })).error).toBe('MailNotConfiguredError');
    } finally {
      logged.mockRestore();
    }
  });
});
