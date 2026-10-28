import { DECLINE_NOTICE_ATTEMPT_MARGIN_MS, DECLINE_NOTICE_SEND_TIMEOUT_MS, DeclineNoticeProcessor } from '@application/use-cases/cycle-tutors/DeclineNoticeProcessor';
import { MailMessage, MailSendError, Mailer } from '@application/ports/Mailer';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { InMemoryDeclineNotices } from '../helpers/inMemoryDeclineNotices';

// LEV-R05: el aviso a la coordinación del rechazo de un docente. Un solo intento automático; lo EN_COLA que nunca se intentó se
// recupera; un intento sin resultado queda INCIERTO y no se repite; el intento inmediato y el proceso de fondo comparten la reserva.
const RESPONDED = new Date('2026-10-28T10:00:00Z');
const coordinator = { id: 'c1', email: 'coord@untrm.edu.pe', firstName: 'Rosa', lastName: 'Mendoza', isActive: true };

describe('DeclineNoticeProcessor', () => {
  let world: InMemoryDeclineNotices;
  let mailer: jest.Mocked<Mailer>;
  let audit: jest.Mocked<AuditLogRepository>;
  let users: Record<string, unknown>;
  let schools: Record<string, unknown>;
  let clock: Date;

  beforeEach(() => {
    clock = new Date('2026-10-28T10:00:05Z');
    world = new InMemoryDeclineNotices();
    world.addAssignment({ id: 'a1', schoolId: 's1', cycle: 3, tutorId: 't1' });
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
    users = { t1: { id: 't1', firstName: 'Ana', lastName: 'Docente', isActive: true, email: 'ana@untrm.edu.pe' }, c1: coordinator };
    schools = { s1: { id: 's1', name: 'Ingeniería de Sistemas', coordinatorId: 'c1' } };
  });

  const processor = (over: { enabled?: boolean; timeoutMs?: number } = {}) =>
    new DeclineNoticeProcessor(
      world,
      {
        findById: async (id: string) => {
          const a = world.assignments.get(id);
          return a ? { ...a } : null;
        },
      } as unknown as CycleTutorRepository,
      { findById: async (id: string) => users[id] ?? null } as unknown as UserRepository,
      { findById: async (id: string) => schools[id] ?? null } as unknown as SchoolRepository,
      { findById: async () => ({ id: 'p1', name: '2026-II' }) } as unknown as AcademicPeriodRepository,
      mailer,
      audit,
      over.enabled ?? true,
      () => clock,
      over.timeoutMs ?? DECLINE_NOTICE_SEND_TIMEOUT_MS,
      { warn: jest.fn(), error: jest.fn() },
    );
  const decline = async () => (await world.recordDecline('a1', 't1', 'Licencia por estudios', RESPONDED)).id;
  const summary = () => world.assignments.get('a1')?.declineNoticeStatus;
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };

  it('el rechazo y su aviso EN_COLA se guardan juntos; nada se envía hasta que alguien lo toma', async () => {
    await decline();

    expect(world.assignments.get('a1')).toMatchObject({ acceptanceStatus: 'RECHAZADA', declineReason: 'Licencia por estudios', declineNoticeStatus: 'EN_COLA' });
    expect(world.attempts).toHaveLength(1);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('entrega el aviso a la coordinación actual, anota a quién se intentó y deja una sola entrada de bitácora vinculada al intento', async () => {
    const id = await decline();
    mailer.send.mockImplementation(async () => {
      expect(world.activeTransactions).toBe(0); // ninguna transacción abierta durante el envío
    });

    const attempt = await processor().attempt(id);

    expect(attempt).toMatchObject({ status: 'ENVIADO', recipientUserId: 'c1', recipientEmail: 'coord@untrm.edu.pe', kind: 'ORIGINAL' });
    const mail = mailer.send.mock.calls[0][0] as MailMessage;
    expect(mail.to).toBe('coord@untrm.edu.pe');
    expect(mail.text).toContain('Licencia por estudios');
    expect(summary()).toBe('ENVIADO');
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(audit.create.mock.calls[0][0]).toMatchObject({ userId: 't1', action: 'CYCLE_TUTOR_DECLINE_NOTICE_RESULT', entityId: 'a1' });
    expect(audit.create.mock.calls[0][0].details).toContain(`intento ${id}`);
    expect(JSON.stringify(audit.create.mock.calls)).not.toMatch(/token|enlace|Licencia/i);
  });

  it('sin envío de correo configurado conserva el aviso EN_COLA: no intenta nada ni lo da por enviado', async () => {
    const id = await decline();

    expect(await processor({ enabled: false }).attempt(id)).toBeNull();
    expect(await processor({ enabled: false }).processDue()).toBe(0);

    expect(summary()).toBe('EN_COLA');
    expect(mailer.send).not.toHaveBeenCalled();
    // Cuando se configure, el proceso de fondo lo toma (nunca se había intentado).
    expect(await processor().processDue()).toBe(1);
    expect(summary()).toBe('ENVIADO');
  });

  describe('un solo envío por intento', () => {
    it('el intento inmediato y dos procesadores a la vez no envían más de una vez (misma reserva atómica)', async () => {
      const id = await decline();
      mailer.send.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 20)));
      const a = processor();
      const b = processor();

      await Promise.all([a.attempt(id), b.attempt(id), a.processDue(), b.processDue()]);

      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(world.attempts[0].status).toBe('ENVIADO');
      expect(audit.create).toHaveBeenCalledTimes(1);
    });

    it('un FALLIDO demostrado no se reintenta solo', async () => {
      const id = await decline();
      mailer.send.mockRejectedValue(new MailSendError('rechazado', 'NOT_ACCEPTED'));
      await processor().attempt(id);
      expect(summary()).toBe('FALLIDO');

      await processor().processDue();
      advance(DECLINE_NOTICE_ATTEMPT_MARGIN_MS * 3);
      await processor().processDue();

      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(world.attempts).toHaveLength(1);
    });

    it.each([
      ['corte durante DATA', Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' })],
      ['error sin datos de la fase', new Error('algo')],
    ])('un resultado incierto (%s) queda INCIERTO y no se repite solo', async (_name, error) => {
      const id = await decline();
      mailer.send.mockRejectedValue(error);

      const attempt = await processor().attempt(id);
      await processor().processDue();
      advance(DECLINE_NOTICE_ATTEMPT_MARGIN_MS * 3);
      await processor().processDue();

      expect(attempt?.status).toBe('INCIERTO');
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('el plazo de espera agotado deja el intento INCIERTO (no FALLIDO) y su resultado tardío se ignora', async () => {
      const id = await decline();
      let late: () => void = () => undefined;
      mailer.send.mockImplementationOnce(() => new Promise<void>((resolve) => (late = resolve)));

      const attempt = await processor({ timeoutMs: 20 }).attempt(id);
      late();
      await new Promise((r) => setImmediate(r));

      expect(attempt).toMatchObject({ status: 'INCIERTO', errorCode: 'SendTimeoutError' });
      expect(world.attempts[0].status).toBe('INCIERTO');
    });
  });

  describe('reinicio del proceso', () => {
    it('recupera lo EN_COLA que nunca se intentó (un procesador nuevo, sin memoria del anterior)', async () => {
      await decline();
      // «Reinicio»: otra instancia del procesador, sin nada en memoria; solo está lo guardado.
      const restarted = processor();

      expect(await restarted.processDue()).toBe(1);

      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(summary()).toBe('ENVIADO');
    });

    it('un intento iniciado sin resultado (el proceso murió durante el envío) pasa a INCIERTO con una sola entrada y nunca se repite solo', async () => {
      const id = await decline();
      await world.claim(id, clock); // empezó el intento y el proceso murió: no hay resultado
      await world.setRecipient(id, clock, { userId: 'c1', email: 'coord@untrm.edu.pe' });
      advance(DECLINE_NOTICE_ATTEMPT_MARGIN_MS + 1000);

      await processor().processDue();
      await processor().processDue();

      expect(world.attempts[0]).toMatchObject({ status: 'INCIERTO', errorCode: 'SIN_RESULTADO', recipientUserId: 'c1' });
      expect(summary()).toBe('INCIERTO');
      expect(mailer.send).not.toHaveBeenCalled();
      expect(audit.create).toHaveBeenCalledTimes(1);
    });

    it('si el margen vence mientras se envía, el resultado tardío no pisa el estado y queda INCIERTO tras la revisión', async () => {
      const id = await decline();
      mailer.send.mockImplementationOnce(async () => {
        advance(DECLINE_NOTICE_ATTEMPT_MARGIN_MS + 1000);
      });
      const p = processor();

      const attempt = await p.attempt(id);
      expect(attempt?.status).toBe('ENVIANDO'); // el resultado tardío fue rechazado: sigue sin resultado
      await p.sweepStale();

      expect(world.attempts[0].status).toBe('INCIERTO');
      expect(audit.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('comprobaciones antes de enviar', () => {
    it.each([
      ['otro docente fue designado', { tutorId: 't2' }],
      ['la designación volvió a empezar', { acceptanceStatus: 'PENDIENTE', respondedAt: null }],
      ['ya no está rechazada', { acceptanceStatus: 'ACEPTADA' }],
      ['el rechazo es otro (otra fecha)', { respondedAt: new Date('2026-10-29T10:00:00Z') }],
    ])('un trabajo obsoleto (%s) no se envía y queda OBSOLETO', async (_name, change) => {
      const id = await decline();
      Object.assign(world.assignments.get('a1') as object, change);

      const attempt = await processor().attempt(id);

      expect(attempt?.status).toBe('OBSOLETO');
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it.each([
      ['la escuela no tiene coordinación', { s1: { id: 's1', name: 'X', coordinatorId: null } }, {}],
      ['la coordinación está desactivada', {}, { c1: { ...coordinator, isActive: false } }],
      ['la coordinación no tiene correo', {}, { c1: { ...coordinator, email: '' } }],
    ])('sin destinatario habilitado (%s) no se envía y queda SIN_DESTINATARIO, distinto de un error de datos', async (_name, schoolChange, userChange) => {
      Object.assign(schools, schoolChange);
      Object.assign(users, userChange);
      const id = await decline();

      const attempt = await processor().attempt(id);

      expect(attempt?.status).toBe('SIN_DESTINATARIO');
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it.each([
      ['no existe la escuela', () => delete schools.s1],
      ['no existe el docente', () => delete users.t1],
    ])('datos faltantes (%s) quedan DATOS_INCOMPLETOS, no SIN_DESTINATARIO', async (_name, arrange) => {
      const id = await decline();
      arrange();

      const attempt = await processor().attempt(id);

      expect(attempt?.status).toBe('DATOS_INCOMPLETOS');
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('si cambió la coordinación antes de enviar, se envía a la coordinación ACTUAL y queda anotado a quién', async () => {
      const id = await decline();
      users.c2 = { id: 'c2', email: 'nueva@untrm.edu.pe', firstName: 'Luis', lastName: 'Nuevo', isActive: true };
      schools.s1 = { id: 's1', name: 'Ingeniería de Sistemas', coordinatorId: 'c2' };

      const attempt = await processor().attempt(id);

      expect(attempt).toMatchObject({ status: 'ENVIADO', recipientUserId: 'c2', recipientEmail: 'nueva@untrm.edu.pe' });
      expect((mailer.send.mock.calls[0][0] as MailMessage).to).toBe('nueva@untrm.edu.pe');
    });
  });

  it('un fallo al escribir la bitácora no deshace ni oculta el resultado del envío', async () => {
    const id = await decline();
    audit.create.mockRejectedValue(new Error('bitácora'));

    const attempt = await processor().attempt(id);

    expect(attempt?.status).toBe('ENVIADO');
    expect(summary()).toBe('ENVIADO');
  });
});
