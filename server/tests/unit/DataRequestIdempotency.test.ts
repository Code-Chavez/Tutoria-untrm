import {
  DataRequestInFlightError,
  DuplicateDataRequestError,
  ListDataRequestsUseCase,
  OperationIdConflictError,
  SendDataRequestUseCase,
} from '@application/use-cases/data-requests/DataRequestUseCases';
import {
  contentHash,
  cyclesScope,
  DATA_REQUEST_ATTEMPT_MARGIN_MS,
  DATA_REQUEST_DUPLICATE_WINDOW_MINUTES,
  DATA_REQUEST_DUPLICATE_WINDOW_MS,
  DATA_REQUEST_SEND_TIMEOUT_MS,
  equivalenceKey,
} from '@application/use-cases/data-requests/dataRequestPolicy';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { MailSendError, Mailer } from '@application/ports/Mailer';
import { StudentTemplateProvider } from '@application/ports/StudentTemplateProvider';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { classifySmtpError } from '../../src/infrastructure/services/smtpOutcome';
import { InMemoryDataRequests } from '../helpers/inMemoryDataRequests';

// LEV-R04: idempotencia (misma operación) y advertencia de equivalencia (operación nueva equivalente), con estados de envío
// PENDIENTE / ENVIADO / FALLIDO / INCIERTO. La ventana y el margen son valores provisionales del proyecto.
const school = { cycleCount: 10, id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, createdAt: new Date('2026-01-01'), requestEmail: 'registros@untrm.edu.pe' };
const user = (id: string) => ({ id, email: `${id}@untrm.edu.pe`, firstName: 'Rosa', lastName: 'Mendoza' });
const OP1 = '11111111-1111-4111-8111-111111111111';
const OP2 = '22222222-2222-4222-8222-222222222222';
const OP3 = '33333333-3333-4333-8333-333333333333';

describe('equivalencia y contenido (puras)', () => {
  const key = (cycles: number[], kind: 'ESTUDIANTES' | 'DOCENTES' = 'ESTUDIANTES', cycleCount = 10) => equivalenceKey({ kind, schoolId: 's1', periodId: 'p1', scope: cyclesScope(kind, cycles, cycleCount) });

  it('el orden y los repetidos de los ciclos no cambian el significado', () => {
    expect(key([3, 1, 2])).toBe(key([1, 2, 3, 3]));
  });

  it('ningún ciclo («todos») y la lista completa de ciclos de la escuela son el mismo alcance; un subconjunto no', () => {
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(key([])).toBe(key(all));
    expect(key([1, 2])).not.toBe(key(all));
    expect(key([1, 2])).not.toBe(key([1, 2, 3]));
  });

  it('con otra cantidad de ciclos la lista completa deja de ser «todos» de otra escuela', () => {
    expect(key([1, 2, 3], 'ESTUDIANTES', 3)).toBe(key([]));
    expect(key([1, 2, 3], 'ESTUDIANTES', 10)).not.toBe(key([]));
  });

  it('en la lista de docentes los ciclos no aplican', () => {
    expect(key([1, 2], 'DOCENTES')).toBe(key([], 'DOCENTES'));
    expect(key([], 'DOCENTES')).not.toBe(key([]));
  });

  it('el contenido distingue destinatario, nota, ciclos, tipo, escuela y periodo (y no el orden ni las mayúsculas del correo)', () => {
    const base = { kind: 'ESTUDIANTES' as const, schoolId: 's1', periodId: 'p1', toEmail: 'a@untrm.edu.pe', cycles: [1, 2], note: null as string | null };
    expect(contentHash(base)).toBe(contentHash({ ...base, toEmail: 'A@UNTRM.edu.pe' }));
    for (const change of [{ toEmail: 'b@untrm.edu.pe' }, { note: 'otra' }, { cycles: [1] }, { kind: 'DOCENTES' as const }, { schoolId: 's2' }, { periodId: 'p2' }]) {
      expect(contentHash({ ...base, ...change })).not.toBe(contentHash(base));
    }
  });

  it('la ventana provisional es de 10 minutos y el margen del intento mayor que el plazo de envío', () => {
    expect(DATA_REQUEST_DUPLICATE_WINDOW_MINUTES).toBe(10);
    expect(DATA_REQUEST_SEND_TIMEOUT_MS).toBeLessThan(DATA_REQUEST_ATTEMPT_MARGIN_MS);
  });
});

describe('clasificación de los fallos de SMTP por fase y respuesta', () => {
  it.each([
    ['conexión rechazada', { code: 'ECONNECTION', command: 'CONN' }, 'NOT_ACCEPTED'],
    ['autenticación', { code: 'EAUTH', command: 'AUTH PLAIN', responseCode: 535 }, 'NOT_ACCEPTED'],
    ['remitente rechazado', { code: 'EENVELOPE', command: 'MAIL FROM', responseCode: 550 }, 'NOT_ACCEPTED'],
    ['destinatario rechazado', { code: 'EENVELOPE', command: 'RCPT TO', responseCode: 550 }, 'NOT_ACCEPTED'],
    ['tiempo agotado antes de DATA', { code: 'ETIMEDOUT', command: 'RCPT TO' }, 'NOT_ACCEPTED'],
    ['rechazo explícito del servidor tras DATA', { code: 'EMESSAGE', command: 'DATA', responseCode: 554 }, 'NOT_ACCEPTED'],
    ['tiempo agotado durante DATA', { code: 'ETIMEDOUT', command: 'DATA' }, 'UNCERTAIN'],
    ['conexión cortada durante DATA', { code: 'ESOCKET', command: 'DATA' }, 'UNCERTAIN'],
    ['conexión cortada sin saber la fase', { code: 'ECONNRESET' }, 'UNCERTAIN'],
    ['error desconocido', new Error('algo'), 'UNCERTAIN'],
    ['sin objeto', undefined, 'UNCERTAIN'],
  ])('%s -> %s', (_name, error, expected) => {
    expect(classifySmtpError(error)).toBe(expected);
  });
});

describe('SendDataRequestUseCase: idempotencia, equivalencia y consistencia', () => {
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'assertSchoolAccess' | 'scopeFor'>>;
  let mailer: jest.Mocked<Mailer>;
  let requests: InMemoryDataRequests;
  let audit: jest.Mocked<AuditLogRepository>;
  let clock: Date;
  let sendTimeoutMs: number;

  beforeEach(() => {
    clock = new Date('2026-10-28T12:00:00Z');
    sendTimeoutMs = 60_000;
    guard = { assertSchoolAccess: jest.fn().mockResolvedValue(undefined), scopeFor: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    requests = new InMemoryDataRequests();
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
  });

  const useCase = () =>
    new SendDataRequestUseCase(
      guard as unknown as StudentAccessGuard,
      { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as AcademicPeriodRepository,
      { findById: jest.fn().mockResolvedValue(school) } as unknown as SchoolRepository,
      { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Ingeniería' }]) } as unknown as FacultyRepository,
      { findById: jest.fn().mockImplementation(async (id: string) => user(id)) } as unknown as UserRepository,
      mailer,
      { build: jest.fn().mockResolvedValue(Buffer.from('x')) } as StudentTemplateProvider,
      requests,
      audit,
      { build: jest.fn().mockResolvedValue(Buffer.from('d')) } as StudentTemplateProvider,
      () => clock,
      sendTimeoutMs,
    );
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };

  describe('idempotencia: repetir la MISMA operación', () => {
    it('envía una sola vez y guarda el pedido con su identificador; el envío ocurre sin ninguna transacción abierta', async () => {
      mailer.send.mockImplementation(async () => {
        expect(requests.activeTransactions).toBe(0);
      });

      const { request, replayed } = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      expect(replayed).toBe(false);
      expect(request).toMatchObject({ status: 'ENVIADO', operationId: OP1, requestedById: 'u1' });
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('repetirla (p. ej. se perdió la respuesta) devuelve el resultado guardado: ni otra fila, ni otro correo, ni otra bitácora', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      const again = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      expect(again.replayed).toBe(true);
      expect(again.request.id).toBe(first.request.id);
      expect(requests.rows).toHaveLength(1);
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(audit.create).toHaveBeenCalledTimes(1);
    });

    it('también si el resultado fue FALLIDO o INCIERTO: repetir esa operación no la reintenta (un reintento es una operación nueva)', async () => {
      mailer.send.mockRejectedValueOnce(new MailSendError('no', 'NOT_ACCEPTED'));
      const failed = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      expect(failed.request.status).toBe('FALLIDO');

      const again = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      expect(again).toMatchObject({ replayed: true, request: { status: 'FALLIDO' } });
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['otra nota', { note: 'distinta' }],
      ['otros ciclos', { cycles: [1, 2] }],
    ])('el mismo identificador con contenido distinto (%s) se rechaza y no envía nada', async (_name, change) => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1, ...change })).rejects.toBeInstanceOf(OperationIdConflictError);

      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(requests.rows).toHaveLength(1);
    });

    it('si cambia el destinatario efectivo de la escuela, el mismo identificador es contenido distinto', async () => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      const other = new SendDataRequestUseCase(
        guard as unknown as StudentAccessGuard,
        { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as AcademicPeriodRepository,
        { findById: jest.fn().mockResolvedValue({ ...school, requestEmail: 'otro@untrm.edu.pe' }) } as unknown as SchoolRepository,
        { findAll: jest.fn().mockResolvedValue([]) } as unknown as FacultyRepository,
        { findById: jest.fn().mockResolvedValue(user('u1')) } as unknown as UserRepository,
        mailer,
        { build: jest.fn().mockResolvedValue(Buffer.from('x')) } as StudentTemplateProvider,
        requests,
        audit,
        undefined,
        () => clock,
      );

      await expect(other.execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 })).rejects.toBeInstanceOf(OperationIdConflictError);
    });

    it('el identificador de otra persona no se ve ni se reutiliza: se trata como una operación propia y nunca devuelve su pedido', async () => {
      const mine = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      advance(DATA_REQUEST_DUPLICATE_WINDOW_MS + 1000);

      const theirs = await useCase().execute('u2', { schoolId: 's1', cycles: [1], operationId: OP1 });

      expect(theirs.replayed).toBe(false);
      expect(theirs.request.id).not.toBe(mine.request.id);
      expect(theirs.request.requestedById).toBe('u2');
      expect(requests.rows).toHaveLength(2);
    });

    it('con el identificador de otra persona y un equivalente reciente, solo se informa el resumen mínimo del pedido anterior', async () => {
      const mine = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      const error = await useCase().execute('u2', { schoolId: 's1', cycles: [1], operationId: OP1 }).catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateDataRequestError);
      expect(Object.keys((error as DuplicateDataRequestError).previous).sort()).toEqual(['createdAt', 'id', 'status']);
      expect((error as DuplicateDataRequestError).previous.id).toBe(mine.request.id);
    });

    it('sin permiso sobre la escuela no se guarda ni se envía nada, aunque el identificador exista', async () => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 })).rejects.toBeInstanceOf(StudentAccessDeniedError);

      expect(requests.rows).toHaveLength(1);
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('advertencia de equivalencia: una operación NUEVA equivalente', () => {
    it('dentro de la ventana pide confirmar e identifica el pedido anterior; no envía nada', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1, 3], operationId: OP1 });

      const error = await useCase().execute('u1', { schoolId: 's1', cycles: [3, 1], operationId: OP2 }).catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateDataRequestError);
      expect((error as DuplicateDataRequestError).previous).toMatchObject({ id: first.request.id, status: 'ENVIADO' });
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(requests.rows).toHaveLength(1);
    });

    it('confirmando ESE pedido se envía como operación nueva y queda enlazada al anterior', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      const second = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: first.request.id });

      expect(second.replayed).toBe(false);
      expect(second.request).toMatchObject({ status: 'ENVIADO', resendOfId: first.request.id, operationId: OP2 });
      expect(mailer.send).toHaveBeenCalledTimes(2);
    });

    it('reintentar ese reenvío confirmado con el mismo identificador no lo duplica', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      const input = { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: first.request.id };
      await useCase().execute('u1', input);

      const again = await useCase().execute('u1', input);

      expect(again.replayed).toBe(true);
      expect(mailer.send).toHaveBeenCalledTimes(2);
      expect(requests.rows).toHaveLength(2);
    });

    it('una confirmación obsoleta no autoriza una situación nueva: si apareció otro equivalente, se vuelve a advertir sobre ese', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      advance(1000);
      // Mientras la persona veía el diálogo del primero, alguien registró otro equivalente confirmándolo.
      const newer = await useCase().execute('u2', { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: first.request.id });
      advance(1000);

      const error = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP3, confirmDuplicateOf: first.request.id }).catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateDataRequestError);
      expect((error as DuplicateDataRequestError).previous.id).toBe(newer.request.id);
      expect(mailer.send).toHaveBeenCalledTimes(2);
    });

    it('una confirmación de un pedido que no es el equivalente más reciente tampoco sirve', async () => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: '99999999-9999-4999-8999-999999999999' })).rejects.toBeInstanceOf(DuplicateDataRequestError);
    });

    it('pasada la ventana se permite sin confirmar', async () => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      advance(DATA_REQUEST_DUPLICATE_WINDOW_MS + 1);

      const second = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 });

      expect(second.request.status).toBe('ENVIADO');
      expect(mailer.send).toHaveBeenCalledTimes(2);
    });

    it('un pedido anterior FALLIDO (fallo confirmado) permite reintentar sin confirmación', async () => {
      mailer.send.mockRejectedValueOnce(new MailSendError('no', 'NOT_ACCEPTED'));
      const failed = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      expect(failed.request.status).toBe('FALLIDO');

      const retry = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 });

      expect(retry.request.status).toBe('ENVIADO');
    });

    it('un pedido anterior INCIERTO sí exige confirmación, porque el correo pudo haber salido', async () => {
      mailer.send.mockRejectedValueOnce(Object.assign(new Error('corte'), { code: 'ESOCKET' }));
      const uncertain = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      expect(uncertain.request.status).toBe('INCIERTO');

      const error = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 }).catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateDataRequestError);
      expect((error as DuplicateDataRequestError).previous.status).toBe('INCIERTO');
    });

    it('cuenta aunque ya esté marcado como recibido', async () => {
      const first = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      await requests.markReceived(first.request.id, 'u1', clock);

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 })).rejects.toBeInstanceOf(DuplicateDataRequestError);
    });

    it('ningún ciclo y todos los ciclos de la escuela son equivalentes; un subconjunto, distintos ciclos o la lista de docentes no', async () => {
      await useCase().execute('u1', { schoolId: 's1', cycles: [], operationId: OP1 });

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], operationId: OP2 })).rejects.toBeInstanceOf(DuplicateDataRequestError);
      const subset = await useCase().execute('u1', { schoolId: 's1', cycles: [1, 2], operationId: OP3 });
      expect(subset.request.status).toBe('ENVIADO');
      const teachers = await useCase().execute('u1', { schoolId: 's1', kind: 'DOCENTES', cycles: [4, 5], operationId: '44444444-4444-4444-8444-444444444444' });
      expect(teachers.request).toMatchObject({ status: 'ENVIADO', kind: 'DOCENTES', cycles: [] });
    });

    it('en la lista de docentes los ciclos que lleguen no cambian el significado', async () => {
      await useCase().execute('u1', { schoolId: 's1', kind: 'DOCENTES', cycles: [], operationId: OP1 });

      await expect(useCase().execute('u1', { schoolId: 's1', kind: 'DOCENTES', cycles: [7], operationId: OP2 })).rejects.toBeInstanceOf(DuplicateDataRequestError);
    });
  });

  describe('envío en curso (PENDIENTE) y resultado incierto', () => {
    it('un equivalente en curso bloquea y NO se puede saltar con una confirmación', async () => {
      let release: () => void = () => undefined;
      mailer.send.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
      const inFlight = useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      await new Promise((r) => setImmediate(r));
      const pending = requests.rows[0];
      expect(pending.status).toBe('PENDIENTE');

      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: pending.id })).rejects.toBeInstanceOf(DataRequestInFlightError);

      release();
      expect((await inFlight).request.status).toBe('ENVIADO');
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('dos solicitudes simultáneas equivalentes: una se envía y la otra queda bloqueada, con un solo correo y una sola fila', async () => {
      mailer.send.mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

      const results = await Promise.allSettled([
        useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 }),
        useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected?.reason).toBeInstanceOf(DataRequestInFlightError);
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(requests.rows).toHaveLength(1);
    });

    it('dos solicitudes simultáneas con el MISMO identificador: una envía y la otra es una repetición', async () => {
      mailer.send.mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

      const [a, b] = await Promise.all([
        useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 }),
        useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 }),
      ]);

      expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(requests.rows).toHaveLength(1);
    });

    it('un envío que no termina en el plazo queda INCIERTO (no FALLIDO) y su resultado tardío se ignora', async () => {
      sendTimeoutMs = 20;
      let late: () => void = () => undefined;
      mailer.send.mockImplementationOnce(() => new Promise<void>((resolve) => (late = resolve)));

      const { request } = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      late();
      await new Promise((r) => setImmediate(r));

      expect(request).toMatchObject({ status: 'INCIERTO', error: 'SendTimeoutError' });
      expect(requests.rows[0].status).toBe('INCIERTO');
    });

    it('si el margen vence mientras se envía, el resultado tardío no pisa el estado: queda INCIERTO', async () => {
      mailer.send.mockImplementationOnce(async () => {
        advance(DATA_REQUEST_ATTEMPT_MARGIN_MS + 1000);
      });

      const { request } = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });

      expect(request.status).toBe('INCIERTO');
      expect(requests.rows[0].status).toBe('PENDIENTE');
    });

    it('si el servidor cae tras enviar y antes de registrar el resultado: un solo correo, queda PENDIENTE, luego INCIERTO, y no se reenvía solo', async () => {
      requests.failNextFinish = true;
      await expect(useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 })).rejects.toThrow('caída');
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(requests.rows[0].status).toBe('PENDIENTE');

      // El cliente conserva el identificador y reintenta la MISMA operación: recibe lo guardado, sin otro correo.
      const retry = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP1 });
      expect(retry).toMatchObject({ replayed: true, request: { status: 'PENDIENTE' } });
      expect(mailer.send).toHaveBeenCalledTimes(1);

      // Vencido el margen se muestra INCIERTO y un reenvío deliberado exige advertencia sobre ese pedido.
      advance(DATA_REQUEST_ATTEMPT_MARGIN_MS + 1000);
      const listed = await new ListDataRequestsUseCase(
        guard as unknown as StudentAccessGuard,
        { findAll: jest.fn().mockResolvedValue([school]) } as unknown as SchoolRepository,
        { findAll: jest.fn().mockResolvedValue([{ id: 'p1', name: '2026-II' }]) } as unknown as AcademicPeriodRepository,
        requests,
        () => clock,
      ).execute('u1');
      expect(listed[0].status).toBe('INCIERTO');
      const error = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2 }).catch((e) => e);
      expect(error).toBeInstanceOf(DuplicateDataRequestError);
      expect((error as DuplicateDataRequestError).previous.status).toBe('INCIERTO');
      const resend = await useCase().execute('u1', { schoolId: 's1', cycles: [1], operationId: OP2, confirmDuplicateOf: requests.rows[0].id });
      expect(resend.request.status).toBe('ENVIADO');
    });
  });
});
