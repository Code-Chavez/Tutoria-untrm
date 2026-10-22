import {
  CycleTutorNotFoundError,
  GetTutorAcceptanceUseCase,
  InvalidAcceptanceLinkError,
  InvalidAvailabilityError,
  RequestTutorAcceptanceUseCase,
  RespondTutorAcceptanceUseCase,
  validateAvailability,
} from '@application/use-cases/cycle-tutors/TutorAcceptanceUseCases';
import { hashSecretToken } from '@application/use-cases/auth/secretToken';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CycleTutorAssignment, CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { Mailer } from '@application/ports/Mailer';

const future = () => new Date(Date.now() + 3_600_000);
const assignment = (over: Partial<CycleTutorAssignment> = {}): CycleTutorAssignment => ({
  id: 'a1', periodId: 'p1', schoolId: 's1', cycle: 3, tutorId: 't1', isException: false, note: null, assignedById: 'coord', createdAt: new Date(),
  acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: future(), ...over,
});
const slot = { day: 1, start: '08:00', end: '09:30', place: 'Aula 12' };

describe('aceptación del tutor (fase 4)', () => {
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'assertSchoolAccess'>>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let cycleTutors: jest.Mocked<CycleTutorRepository>;
  let parameters: jest.Mocked<SystemParameterRepository>;
  let mailer: jest.Mocked<Mailer>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    guard = { assertSchoolAccess: jest.fn().mockResolvedValue(undefined) };
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }), findById: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as jest.Mocked<AcademicPeriodRepository>;
    schools = { findById: jest.fn().mockResolvedValue({ id: 's1', name: 'Sistemas', coordinatorId: 'c1' }) } as unknown as jest.Mocked<SchoolRepository>;
    users = {
      findById: jest.fn().mockImplementation(async (id: string) => (id === 'c1' ? { id: 'c1', email: 'coord@untrm.edu.pe' } : { id: 't1', email: 'tutor@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez' })),
    } as unknown as jest.Mocked<UserRepository>;
    cycleTutors = {
      find: jest.fn().mockResolvedValue(assignment({ acceptanceStatus: 'SIN_SOLICITAR' })),
      findByAcceptanceToken: jest.fn().mockResolvedValue(assignment()),
      requestAcceptance: jest.fn().mockResolvedValue(undefined),
      recordResponse: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CycleTutorRepository>;
    parameters = { findByKey: jest.fn().mockResolvedValue(null) } as unknown as jest.Mocked<SystemParameterRepository>;
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
  });

  describe('solicitar la aceptación', () => {
    const request = () => new RequestTutorAcceptanceUseCase(guard as unknown as StudentAccessGuard, periods, schools, users, cycleTutors, mailer, audit, { publicUrl: 'https://sit.untrm.edu.pe/', ttlHours: 72 });

    it('guarda solo la huella del enlace, lo envía al docente y deja constancia sin el enlace', async () => {
      const result = await request().execute('coord', 's1', 3, '10.0.0.1');

      expect(result).toEqual({ emailSent: true });
      const [id, hash, expiresAt] = cycleTutors.requestAcceptance.mock.calls[0];
      expect(id).toBe('a1');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      const mail = mailer.send.mock.calls[0][0];
      const token = /aceptar-tutoria\/([0-9a-f]{64})/.exec(mail.text)?.[1] as string;
      expect(hashSecretToken(token)).toBe(hash);
      expect(mail.to).toBe('tutor@untrm.edu.pe');
      expect(mail.subject).toContain('ciclo 3');
      expect(JSON.stringify(audit.create.mock.calls[0][0])).not.toContain(token);
    });

    it('si el ciclo es una excepción, el correo pregunta si puede asumirlo', async () => {
      cycleTutors.find.mockResolvedValue(assignment({ isException: true, acceptanceStatus: 'SIN_SOLICITAR' }));

      await request().execute('coord', 's1', 3);

      expect(mailer.send.mock.calls[0][0].text).toMatch(/excepción.*puede asumirlo/);
    });

    it('si el correo no sale, la solicitud queda pendiente y se informa', async () => {
      mailer.send.mockRejectedValue(new Error('smtp'));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(await request().execute('coord', 's1', 3)).toEqual({ emailSent: false });
      expect(cycleTutors.requestAcceptance).toHaveBeenCalled();
    });

    it('respeta el alcance y exige que el ciclo tenga tutor', async () => {
      guard.assertSchoolAccess.mockRejectedValue(new StudentAccessDeniedError());
      await expect(request().execute('otro', 's1', 3)).rejects.toBeInstanceOf(StudentAccessDeniedError);

      guard.assertSchoolAccess.mockResolvedValue(undefined);
      cycleTutors.find.mockResolvedValue(null);
      await expect(request().execute('coord', 's1', 3)).rejects.toBeInstanceOf(CycleTutorNotFoundError);
    });
  });

  describe('abrir el enlace', () => {
    const get = () => new GetTutorAcceptanceUseCase(cycleTutors, users, schools, periods, parameters);

    it('muestra al docente su ciclo y el tope semanal vigente', async () => {
      parameters.findByKey.mockResolvedValue({ key: 'tutor_max_weekly_hours', value: '6' } as never);

      expect(await get().execute('tok')).toMatchObject({ tutorName: 'Elena Ramírez', school: 'Sistemas', cycle: 3, period: '2026-II', maxWeeklyHours: 6, sessionMinutes: 45 });
    });

    it.each([
      ['no existe', null],
      ['ya respondió', assignment({ acceptanceStatus: 'ACEPTADA' })],
      ['venció', assignment({ acceptanceExpiresAt: new Date(Date.now() - 1000) })],
    ])('un enlace que %s se rechaza igual', async (_label, row) => {
      cycleTutors.findByAcceptanceToken.mockResolvedValue(row);

      await expect(get().execute('tok')).rejects.toBeInstanceOf(InvalidAcceptanceLinkError);
    });
  });

  describe('responder', () => {
    const invitations = { execute: jest.fn() };
    beforeEach(() => { invitations.execute.mockReset(); });
    const respond = () => new RespondTutorAcceptanceUseCase(cycleTutors, users, schools, periods, parameters, mailer, audit, invitations);

    it('al aceptar guarda su disponibilidad y consume el enlace', async () => {
      await respond().execute('tok', { accept: true, availability: [slot] }, '10.0.0.1');

      expect(cycleTutors.recordResponse).toHaveBeenCalledWith('a1', { accepted: true, availability: [slot] }, expect.any(Date));
      expect(audit.create.mock.calls[0][0]).toMatchObject({ userId: 't1', action: 'CYCLE_TUTOR_ACCEPTED' });
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('ofrece activación solo a una cuenta activa pendiente de crear contraseña', async () => {
      users.findById.mockResolvedValue({ id: 't1', isActive: true, mustChangePassword: true } as never);
      invitations.execute.mockResolvedValue({ link: 'https://sit.untrm.edu.pe/activar-cuenta/secret' });
      await expect(respond().execute('tok', { accept: true, availability: [slot] })).resolves.toEqual({ accepted: true, activationLink: 'https://sit.untrm.edu.pe/activar-cuenta/secret' });
      expect(invitations.execute).toHaveBeenCalledWith('t1', 't1', undefined);
      expect(JSON.stringify(audit.create.mock.calls)).not.toContain('/activar-cuenta/secret');
    });

    it.each([false, true])('no emite activación si la cuenta está activada o deshabilitada (%s)', async (mustChangePassword) => {
      users.findById.mockResolvedValue({ id: 't1', isActive: !mustChangePassword, mustChangePassword } as never);
      await expect(respond().execute('tok', { accept: true, availability: [slot] })).resolves.toEqual({ accepted: true });
      expect(invitations.execute).not.toHaveBeenCalled();
    });

    it('conserva la aceptación e informa si no se pudo preparar la activación', async () => {
      users.findById.mockResolvedValue({ id: 't1', isActive: true, mustChangePassword: true } as never);
      invitations.execute.mockRejectedValue(new Error('unavailable'));
      await expect(respond().execute('tok', { accept: true, availability: [slot] })).resolves.toEqual({ accepted: true, activationUnavailable: true });
    });

    it('al rechazar exige el motivo y avisa a la coordinación del colegio', async () => {
      await expect(respond().execute('tok', { accept: false, reason: ' ' })).rejects.toBeInstanceOf(InvalidAvailabilityError);

      await respond().execute('tok', { accept: false, reason: 'Licencia por estudios' });

      expect(cycleTutors.recordResponse).toHaveBeenCalledWith('a1', { accepted: false, declineReason: 'Licencia por estudios' }, expect.any(Date));
      const mail = mailer.send.mock.calls[0][0];
      expect(mail.to).toBe('coord@untrm.edu.pe');
      expect(mail.text).toContain('Licencia por estudios');
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'CYCLE_TUTOR_DECLINED' });
    });

    it('si el aviso a la coordinación falla, el rechazo igual queda registrado', async () => {
      mailer.send.mockRejectedValue(new Error('smtp'));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(respond().execute('tok', { accept: false, reason: 'Licencia por estudios' })).resolves.toEqual({ accepted: false });
    });

    it('un enlace inválido o ya usado no registra nada', async () => {
      cycleTutors.findByAcceptanceToken.mockResolvedValue(null);

      await expect(respond().execute('tok', { accept: true, availability: [slot] })).rejects.toBeInstanceOf(InvalidAcceptanceLinkError);
      expect(cycleTutors.recordResponse).not.toHaveBeenCalled();
    });
  });

  describe('validar la disponibilidad', () => {
    it('acepta tramos de al menos 45 minutos, los ordena y limpia el lugar', () => {
      const result = validateAvailability([{ day: 3, start: '10:00', end: '10:45', place: ' Lab 2 ' }, { day: 1, start: '08:00', end: '09:00' }], 10);

      expect(result.map((s) => s.day)).toEqual([1, 3]);
      expect(result[1].place).toBe('Lab 2');
    });

    it.each([
      ['vacía', []],
      ['menos de 45 minutos', [{ day: 1, start: '08:00', end: '08:30' }]],
      ['día fuera de lunes a sábado', [{ day: 7, start: '08:00', end: '09:00' }]],
      ['hora mal formada', [{ day: 1, start: '8am', end: '09:00' }]],
      ['tramos que se cruzan', [{ day: 1, start: '08:00', end: '09:30' }, { day: 1, start: '09:00', end: '10:00' }]],
      ['pasa del tope semanal', [{ day: 1, start: '08:00', end: '12:00' }, { day: 2, start: '08:00', end: '12:00' }, { day: 3, start: '08:00', end: '12:00' }]],
    ])('rechaza una disponibilidad %s', (_label, slots) => {
      expect(() => validateAvailability(slots, 10)).toThrow(InvalidAvailabilityError);
    });
  });
});
