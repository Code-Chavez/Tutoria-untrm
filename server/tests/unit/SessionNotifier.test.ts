import { SessionNotifier, sessionNoticeMessage } from '@application/services/SessionNotifier';
import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import { RescheduleSessionUseCase } from '@application/use-cases/sessions/RescheduleSessionUseCase';
import { CancelSessionUseCase } from '@application/use-cases/sessions/CancelSessionUseCase';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';
import { allowAllGuard } from '../helpers/studentGuard';

// U06: el sistema avisa de verdad a los tutorados cuando una sesión se programa, se reprograma o se cancela, con lo que necesitan
// saber (fecha, lugar, motivo) y sin prometer nada a quien no tiene cuenta del portal.
const when = (iso: string) => new Date(iso);
const session = (over: Partial<SessionWithParticipants> = {}) =>
  ({
    id: 'ses-1',
    tutorId: 'tutor-1',
    topic: 'Hábitos',
    scheduledAt: when('2033-03-01T15:00:00Z'), // 10:00 en Lima
    durationMinutes: 45,
    endsAt: when('2033-03-01T15:45:00Z'),
    modality: 'PRESENCIAL',
    location: 'Aula 204',
    meetingLink: null,
    cancelledAt: null,
    studentIds: ['s1'],
    ...over,
  }) as SessionWithParticipants;
const linked = (id: string, userId: string | null) => ({ id, userId }) as Student;

describe('avisos de sesión', () => {
  let students: jest.Mocked<StudentRepository>;
  let notifications: jest.Mocked<NotificationRepository>;
  let notifier: SessionNotifier;
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    students = { findById: jest.fn().mockImplementation(async (id: string) => linked(id, `user-${id}`)) } as unknown as jest.Mocked<StudentRepository>;
    notifications = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<NotificationRepository>;
    logger.warn.mockClear();
    notifier = new SessionNotifier(students, notifications, logger);
  });

  describe('texto', () => {
    it('programada: fecha en hora de Lima y lugar', () => {
      const text = sessionNoticeMessage(session(), { kind: 'scheduled' });
      expect(text).toContain('Tu tutor programó una sesión de tutoría');
      expect(text).toMatch(/1 de marzo de 2033/);
      expect(text).toMatch(/10:00/); // hora de Lima (12 horas)
      expect(text).toContain('Lugar: Aula 204.');
    });

    it('virtual: no pone el enlace en el aviso, remite a «Mis sesiones»', () => {
      const text = sessionNoticeMessage(session({ modality: 'VIRTUAL', location: null, meetingLink: 'https://meet.example/secreto' }), { kind: 'scheduled' });
      expect(text).toContain('Modalidad virtual');
      expect(text).toContain('Mis sesiones');
      expect(text).not.toContain('meet.example');
    });

    it('reprogramada: dice antes, ahora y el motivo', () => {
      const text = sessionNoticeMessage(session({ scheduledAt: when('2033-03-02T20:00:00Z') }), { kind: 'rescheduled', previousScheduledAt: when('2033-03-01T15:00:00Z'), reason: 'Feriado' });
      expect(text).toMatch(/antes: .*1 de marzo.*10:00/);
      expect(text).toMatch(/ahora: .*2 de marzo.*3:00/); // 20:00 UTC = 3:00 p. m. en Lima
      expect(text).toContain('Motivo: Feriado');
    });

    it('cancelada: dice de qué fecha y por qué', () => {
      const text = sessionNoticeMessage(session(), { kind: 'cancelled', reason: 'Enfermedad del tutor' });
      expect(text).toMatch(/Se canceló tu sesión de tutoría \(.*1 de marzo/);
      expect(text).toContain('Motivo: Enfermedad del tutor');
    });
  });

  describe('quién recibe el aviso', () => {
    it('cada participante con cuenta de portal recibe el suyo, con el tipo y la sesión', async () => {
      const notice = await notifier.notify(session({ studentIds: ['s1', 's2'] }), { kind: 'scheduled' });

      expect(notice).toEqual({ notified: 2, notReached: 0 });
      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-s1', type: 'SESSION_SCHEDULED', sessionId: 'ses-1' }));
    });

    it('quien no tiene cuenta del portal no recibe nada y se informa a quien hizo el cambio', async () => {
      students.findById.mockImplementation(async (id: string) => linked(id, id === 's2' ? null : `user-${id}`));

      const notice = await notifier.notify(session({ studentIds: ['s1', 's2'] }), { kind: 'cancelled', reason: 'x' });

      expect(notice).toEqual({ notified: 1, notReached: 1 });
      expect(notifications.create).toHaveBeenCalledTimes(1);
    });

    it('quien ya recibió su aviso por este mismo hecho (por su solicitud) no lo recibe dos veces', async () => {
      const notice = await notifier.notify(session({ studentIds: ['s1', 's2'] }), { kind: 'scheduled' }, new Set(['s1']));

      expect(notice).toEqual({ notified: 2, notReached: 0 });
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-s2' }));
    });

    it('un aviso que falla no deshace la operación: se cuenta como no alcanzado y no se registran datos del caso', async () => {
      notifications.create.mockRejectedValue(Object.assign(new Error('Ana Torres: constraint'), { name: 'PrismaError' }));

      const notice = await notifier.notify(session(), { kind: 'scheduled' });

      expect(notice).toEqual({ notified: 0, notReached: 1 });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(String(logger.warn.mock.calls[0][0])).not.toContain('Ana Torres');
    });
  });

  describe('en los casos de uso de la sesión', () => {
    let sessions: jest.Mocked<SessionRepository>;
    const future = new Date(Date.now() + 86_400_000);
    const base = () => session({ scheduledAt: future, endsAt: new Date(future.getTime() + 45 * 60_000) });

    beforeEach(() => {
      sessions = {
        create: jest.fn().mockImplementation(async (d, ids) => ({ id: 'new', createdAt: new Date(), studentIds: ids, ...d })),
        findById: jest.fn().mockImplementation(async () => base()),
        findOverlapping: jest.fn().mockResolvedValue([]),
        reschedule: jest.fn(),
        cancel: jest.fn(),
        createChangeHistory: jest.fn(),
      } as unknown as jest.Mocked<SessionRepository>;
    });

    it('programar avisa a los participantes y devuelve a quién se avisó', async () => {
      const params = { findByKey: jest.fn().mockResolvedValue({ value: '45' }) } as unknown as SystemParameterRepository;
      const useCase = new ScheduleSessionUseCase(sessions, allowAllGuard(students), params, undefined, notifier);

      const result = await useCase.execute('tutor-1', { studentIds: ['s1'], topic: 'Tema', scheduledAt: future.toISOString(), modality: 'PRESENCIAL', location: 'Aula' });

      expect(result.notice).toEqual({ notified: 1, notReached: 0 });
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'SESSION_SCHEDULED', sessionId: 'new' }));
    });

    it('reprogramar avisa con el horario anterior y el motivo', async () => {
      const useCase = new RescheduleSessionUseCase(sessions, notifier);

      const result = await useCase.execute('ses-1', 'tutor-1', { scheduledAt: new Date(future.getTime() + 86_400_000).toISOString(), reason: 'Paro de transporte' });

      expect(result.notice).toEqual({ notified: 1, notReached: 0 });
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'SESSION_RESCHEDULED', message: expect.stringContaining('Paro de transporte') }));
    });

    it('cancelar avisa con el motivo', async () => {
      const useCase = new CancelSessionUseCase(sessions, notifier);

      const result = await useCase.execute('ses-1', 'tutor-1', { reason: 'Enfermedad' });

      expect(result.notice).toEqual({ notified: 1, notReached: 0 });
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'SESSION_CANCELLED', message: expect.stringContaining('Enfermedad') }));
    });

    it('si quien no es el tutor intenta cambiarla, no se avisa a nadie', async () => {
      await expect(new CancelSessionUseCase(sessions, notifier).execute('ses-1', 'otro-tutor', { reason: 'x' })).rejects.toThrow();
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});
