import {
  DeclineNoticeAlreadySentError,
  DeclineNoticeConfirmationRequiredError,
  DeclineNoticeDeliveryDisabledError,
  DeclineNoticeInFlightError,
  DeclineNoticeNotRejectedError,
  NoEnabledRecipientError,
  ResendDeclineNoticeUseCase,
} from '@application/use-cases/cycle-tutors/ResendDeclineNoticeUseCase';
import { DECLINE_NOTICE_ATTEMPT_MARGIN_MS, DeclineNoticeProcessor } from '@application/use-cases/cycle-tutors/DeclineNoticeProcessor';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { MailSendError, Mailer } from '@application/ports/Mailer';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { InMemoryDeclineNotices } from '../helpers/inMemoryDeclineNotices';

// LEV-R05: el reenvío del aviso. Solo reenvía el correo (el rechazo no se toca), con identidad de operación, confirmación del intento
// incierto mostrado, destinatario habilitado actual y bloqueo de envíos simultáneos.
const OP1 = '11111111-1111-4111-8111-111111111111';
const OP2 = '22222222-2222-4222-8222-222222222222';
const OP3 = '33333333-3333-4333-8333-333333333333';
const RESPONDED = new Date('2026-10-28T10:00:00Z');
const coordinator = { id: 'c1', email: 'coord@untrm.edu.pe', firstName: 'Rosa', lastName: 'Mendoza', isActive: true };

describe('ResendDeclineNoticeUseCase', () => {
  let world: InMemoryDeclineNotices;
  let mailer: jest.Mocked<Mailer>;
  let audit: jest.Mocked<AuditLogRepository>;
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'assertSchoolAccess'>>;
  let users: Record<string, unknown>;
  let schools: Record<string, unknown>;
  let clock: Date;
  let enabled: boolean;
  let originalId: string;

  beforeEach(async () => {
    clock = new Date('2026-10-28T10:00:05Z');
    enabled = true;
    world = new InMemoryDeclineNotices();
    world.addAssignment({ id: 'a1', schoolId: 's1', cycle: 3, tutorId: 't1' });
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
    guard = { assertSchoolAccess: jest.fn().mockResolvedValue(undefined) };
    users = { t1: { id: 't1', firstName: 'Ana', lastName: 'Docente', isActive: true, email: 'ana@untrm.edu.pe' }, c1: coordinator };
    schools = { s1: { id: 's1', name: 'Ingeniería de Sistemas', coordinatorId: 'c1' } };
    originalId = (await world.recordDecline('a1', 't1', 'Licencia por estudios', RESPONDED)).id;
  });

  const cycleTutors = () =>
    ({
      find: async (_p: string, schoolId: string, cycle: number) => [...world.assignments.values()].find((a) => a.schoolId === schoolId && a.cycle === cycle) ?? null,
      findById: async (id: string) => world.assignments.get(id) ?? null,
    }) as unknown as CycleTutorRepository;
  const usersRepo = () => ({ findById: async (id: string) => users[id] ?? null }) as unknown as UserRepository;
  const schoolsRepo = () => ({ findById: async (id: string) => schools[id] ?? null }) as unknown as SchoolRepository;
  const periodsRepo = () => ({ findActive: async () => ({ id: 'p1', name: '2026-II' }), findById: async () => ({ id: 'p1', name: '2026-II' }) }) as unknown as AcademicPeriodRepository;
  const processor = () => new DeclineNoticeProcessor(world, cycleTutors(), usersRepo(), schoolsRepo(), periodsRepo(), mailer, audit, enabled, () => clock, 60_000, { warn: jest.fn(), error: jest.fn() });
  const resend = () => new ResendDeclineNoticeUseCase(guard as unknown as StudentAccessGuard, periodsRepo(), schoolsRepo(), usersRepo(), cycleTutors(), world, processor(), audit, () => clock);
  const run = (who: string, input: { operationId: string; confirmPrevious?: { attemptId: string | null } }) => resend().execute(who, 's1', 3, input, '10.0.0.1');
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  /** El aviso original llega a un estado dado, intentándolo con el procesador. */
  const original = async (outcome: 'ok' | 'notAccepted' | 'uncertain') => {
    if (outcome === 'notAccepted') mailer.send.mockRejectedValueOnce(new MailSendError('no', 'NOT_ACCEPTED'));
    if (outcome === 'uncertain') mailer.send.mockRejectedValueOnce(Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' }));
    await processor().attempt(originalId);
    mailer.send.mockClear();
  };

  describe('autorización y condiciones previas', () => {
    it('sin acceso a la escuela no se crea nada ni se envía', async () => {
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());

      await expect(run('u2', { operationId: OP1 })).rejects.toBeInstanceOf(StudentAccessDeniedError);

      expect(world.attempts).toHaveLength(1);
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('sin envío de correo configurado explica la causa y no crea ningún intento', async () => {
      enabled = false;
      await expect(run('u1', { operationId: OP1, confirmPrevious: { attemptId: null } })).rejects.toBeInstanceOf(DeclineNoticeDeliveryDisabledError);
      expect(world.attempts).toHaveLength(1);
    });

    it.each([
      ['sin coordinación', () => (schools.s1 = { id: 's1', name: 'X', coordinatorId: null })],
      ['coordinación desactivada', () => (users.c1 = { ...coordinator, isActive: false })],
    ])('%s: «no hay un destinatario habilitado» y no se crea ningún intento', async (_name, arrange) => {
      arrange();

      await expect(run('u1', { operationId: OP1, confirmPrevious: { attemptId: null } })).rejects.toBeInstanceOf(NoEnabledRecipientError);
      await expect(run('u1', { operationId: OP1, confirmPrevious: { attemptId: null } })).rejects.toThrow('No se realizó el envío porque no hay un destinatario habilitado.');

      expect(world.attempts).toHaveLength(1);
    });

    it.each([
      ['ya no está rechazada', { acceptanceStatus: 'ACEPTADA' }],
      ['la designación volvió a empezar', { acceptanceStatus: 'PENDIENTE', respondedAt: null }],
    ])('un reenvío obsoleto (%s) se rechaza', async (_name, change) => {
      Object.assign(world.assignments.get('a1') as object, change);

      await expect(run('u1', { operationId: OP1, confirmPrevious: { attemptId: originalId } })).rejects.toBeInstanceOf(DeclineNoticeNotRejectedError);
      expect(mailer.send).not.toHaveBeenCalled();
    });
  });

  describe('según el resultado anterior', () => {
    it('un FALLIDO demostrado se reenvía sin confirmación: solo el correo, y el rechazo queda intacto', async () => {
      await original('notAccepted');
      const before = JSON.stringify({ ...world.assignments.get('a1'), declineNoticeStatus: undefined, declineNoticeAttemptId: undefined });

      const result = await run('u1', { operationId: OP1 });

      expect(result).toMatchObject({ replayed: false, attempt: { status: 'ENVIADO', kind: 'REENVIO', reason: 'REINTENTO_TRAS_FALLO', previousAttemptId: originalId, requestedById: 'u1', recipientUserId: 'c1' }, recipientName: 'Rosa Mendoza' });
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(JSON.stringify({ ...world.assignments.get('a1'), declineNoticeStatus: undefined, declineNoticeAttemptId: undefined })).toBe(before);
    });

    it('un ENVIADO no se reenvía', async () => {
      await original('ok');

      const error = await run('u1', { operationId: OP1 }).catch((e) => e);

      expect(error).toBeInstanceOf(DeclineNoticeAlreadySentError);
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('un intento en cola o en curso bloquea y NO se puede saltar con una confirmación', async () => {
      // EN_COLA (nunca se intentó)
      await expect(run('u1', { operationId: OP1, confirmPrevious: { attemptId: originalId } })).rejects.toBeInstanceOf(DeclineNoticeInFlightError);
      // ENVIANDO vigente
      await world.claim(originalId, clock);
      await expect(run('u1', { operationId: OP2, confirmPrevious: { attemptId: originalId } })).rejects.toBeInstanceOf(DeclineNoticeInFlightError);
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('al vencer el margen un intento en curso pasa a INCIERTO y entonces se puede decidir un reenvío con advertencia', async () => {
      await world.claim(originalId, clock);
      advance(DECLINE_NOTICE_ATTEMPT_MARGIN_MS + 1000);

      const error = await run('u1', { operationId: OP1 }).catch((e) => e);

      expect(error).toBeInstanceOf(DeclineNoticeConfirmationRequiredError);
      expect((error as DeclineNoticeConfirmationRequiredError).previous).toMatchObject({ attemptId: originalId, status: 'INCIERTO' });
    });

    it('un INCIERTO exige confirmar ESE intento; sin confirmar o con otro intento se vuelve a advertir sobre el actual', async () => {
      await original('uncertain');

      const none = await run('u1', { operationId: OP1 }).catch((e) => e);
      const stale = await run('u1', { operationId: OP1, confirmPrevious: { attemptId: '99999999-9999-4999-8999-999999999999' } }).catch((e) => e);

      for (const error of [none, stale]) {
        expect(error).toBeInstanceOf(DeclineNoticeConfirmationRequiredError);
        expect((error as DeclineNoticeConfirmationRequiredError).previous).toMatchObject({ attemptId: originalId, status: 'INCIERTO' });
      }
      expect(mailer.send).not.toHaveBeenCalled();

      const confirmed = await run('u1', { operationId: OP1, confirmPrevious: { attemptId: originalId } });
      expect(confirmed.attempt).toMatchObject({ status: 'ENVIADO', reason: 'CONFIRMADO_TRAS_INCIERTO', previousAttemptId: originalId });
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('una confirmación antigua no autoriza un intento diferente: tras un reenvío incierto, confirmar el original no vale', async () => {
      await original('uncertain');
      mailer.send.mockRejectedValueOnce(Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' }));
      const second = await run('u1', { operationId: OP1, confirmPrevious: { attemptId: originalId } });
      expect(second.attempt.status).toBe('INCIERTO');

      const error = await run('u1', { operationId: OP2, confirmPrevious: { attemptId: originalId } }).catch((e) => e);

      expect(error).toBeInstanceOf(DeclineNoticeConfirmationRequiredError);
      expect((error as DeclineNoticeConfirmationRequiredError).previous.attemptId).toBe(second.attempt.id);
    });

    it('un rechazo anterior a esta función (sin ningún intento registrado) no se presenta como enviado ni fallido: exige confirmar «sin registro»', async () => {
      world.attempts = [];
      Object.assign(world.assignments.get('a1') as object, { declineNoticeStatus: null, declineNoticeAttemptId: null });

      const error = await run('u1', { operationId: OP1 }).catch((e) => e);
      expect(error).toBeInstanceOf(DeclineNoticeConfirmationRequiredError);
      expect((error as DeclineNoticeConfirmationRequiredError).previous).toEqual({ attemptId: null, status: null, at: null });

      const result = await run('u1', { operationId: OP1, confirmPrevious: { attemptId: null } });
      expect(result.attempt).toMatchObject({ status: 'ENVIADO', reason: 'SIN_REGISTRO_PREVIO', previousAttemptId: null });
    });

    it('si el anterior no se envió (SIN_DESTINATARIO) se puede reintentar al haber un destinatario, con su motivo', async () => {
      schools.s1 = { id: 's1', name: 'X', coordinatorId: null };
      await processor().attempt(originalId);
      expect(world.attempts[0].status).toBe('SIN_DESTINATARIO');
      schools.s1 = { id: 's1', name: 'Ingeniería de Sistemas', coordinatorId: 'c1' };

      const result = await run('u1', { operationId: OP1 });

      expect(result.attempt).toMatchObject({ status: 'ENVIADO', reason: 'REINTENTO_SIN_ENVIO' });
    });
  });

  describe('identidad de la operación', () => {
    it('repetir la misma operación (p. ej. se perdió la respuesta) devuelve lo guardado: ni otro intento, ni otro correo, ni otra bitácora', async () => {
      await original('notAccepted');
      const first = await run('u1', { operationId: OP1 });
      const mails = mailer.send.mock.calls.length;
      const entries = audit.create.mock.calls.length;

      const again = await run('u1', { operationId: OP1 });

      expect(again.replayed).toBe(true);
      expect(again.attempt.id).toBe(first.attempt.id);
      expect(world.attempts).toHaveLength(2);
      expect(mailer.send).toHaveBeenCalledTimes(mails);
      expect(audit.create).toHaveBeenCalledTimes(entries);
    });

    it('repetir una operación cuyo intento quedó INCIERTO no la reintenta ni exige confirmar otra vez', async () => {
      await original('notAccepted');
      mailer.send.mockRejectedValueOnce(Object.assign(new Error('corte'), { code: 'ESOCKET', command: 'DATA' }));
      const first = await run('u1', { operationId: OP1 });
      expect(first.attempt.status).toBe('INCIERTO');
      mailer.send.mockClear();

      const again = await run('u1', { operationId: OP1 });

      expect(again).toMatchObject({ replayed: true, attempt: { id: first.attempt.id, status: 'INCIERTO' } });
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('el identificador de otra persona no se ve: la búsqueda es solo del solicitante', async () => {
      await original('notAccepted');
      const mine = await run('u1', { operationId: OP1 });

      // Otra persona con el mismo identificador: no recibe el intento ajeno; se evalúa como operación propia (aquí, ya enviado).
      const error = await run('u2', { operationId: OP1 }).catch((e) => e);

      expect(error).toBeInstanceOf(DeclineNoticeAlreadySentError);
      expect(Object.keys((error as DeclineNoticeAlreadySentError).previous).sort()).toEqual(['at', 'attemptId', 'status']);
      expect((error as DeclineNoticeAlreadySentError).previous.attemptId).toBe(mine.attempt.id);
      expect(world.attempts.filter((a) => a.requestedById === 'u2')).toHaveLength(0);
    });

    it('un identificador usado con otra designación se rechaza sin revelar datos', async () => {
      world.addAssignment({ id: 'a2', schoolId: 's1', cycle: 4, tutorId: 't1', acceptanceStatus: 'RECHAZADA', respondedAt: RESPONDED });
      await world.recordDecline('a2', 't1', 'Otro motivo', RESPONDED);
      await processor().attempt(world.attempts[1].id);
      await original('notAccepted');
      await run('u1', { operationId: OP1 });

      await expect(resend().execute('u1', 's1', 4, { operationId: OP1 })).rejects.toThrow(/ya se usó con otros datos/);
    });
  });

  describe('concurrencia', () => {
    it('dos reenvíos simultáneos con distinto identificador: uno envía y el otro queda bloqueado; un solo correo', async () => {
      await original('notAccepted');
      mailer.send.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 20)));

      const results = await Promise.allSettled([run('u1', { operationId: OP1 }), run('u2', { operationId: OP2 })]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const reason = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;
      expect(reason instanceof DeclineNoticeInFlightError || reason instanceof DeclineNoticeAlreadySentError).toBe(true);
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(world.attempts).toHaveLength(2);
    });

    it('dos reenvíos simultáneos con el MISMO identificador: uno envía y el otro es una repetición', async () => {
      await original('notAccepted');
      mailer.send.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 20)));

      const [a, b] = await Promise.all([run('u1', { operationId: OP1 }), run('u1', { operationId: OP1 })]);

      expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
      expect(mailer.send).toHaveBeenCalledTimes(1);
      expect(world.attempts).toHaveLength(2);
    });
  });

  describe('bitácora', () => {
    it('un reenvío deja una entrada de solicitud (con actor y motivo) y una de resultado, vinculadas al mismo intento, sin datos técnicos', async () => {
      await original('notAccepted');
      audit.create.mockClear();

      const { attempt } = await run('u1', { operationId: OP3 });

      const entries = audit.create.mock.calls.map((c) => c[0]);
      expect(entries.map((e) => e.action)).toEqual(['CYCLE_TUTOR_DECLINE_NOTICE_RESEND', 'CYCLE_TUTOR_DECLINE_NOTICE_RESULT']);
      expect(entries[0]).toMatchObject({ userId: 'u1', ipAddress: '10.0.0.1', entityId: 'a1' });
      expect(entries[0].details).toContain(`intento ${attempt.id}`);
      expect(entries[0].details).toContain('REINTENTO_TRAS_FALLO');
      expect(entries[1].details).toContain(`intento ${attempt.id}`);
      expect(entries[1].details).toContain('destinatario c1');
      expect(JSON.stringify(entries)).not.toMatch(/token|coord@untrm|Licencia/i);
    });

    it('si cambió la coordinación, el reenvío va a la actual y deja constancia de a quién', async () => {
      await original('notAccepted');
      users.c2 = { id: 'c2', email: 'nueva@untrm.edu.pe', firstName: 'Luis', lastName: 'Nuevo', isActive: true };
      schools.s1 = { id: 's1', name: 'Ingeniería de Sistemas', coordinatorId: 'c2' };

      const { attempt, recipientName } = await run('u1', { operationId: OP1 });

      expect(attempt).toMatchObject({ recipientUserId: 'c2', recipientEmail: 'nueva@untrm.edu.pe' });
      expect(recipientName).toBe('Luis Nuevo');
      expect((mailer.send.mock.calls[0][0] as { to: string }).to).toBe('nueva@untrm.edu.pe');
    });
  });
});
