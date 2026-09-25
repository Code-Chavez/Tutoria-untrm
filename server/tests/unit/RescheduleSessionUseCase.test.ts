import { RescheduleSessionUseCase } from '@application/use-cases/sessions/RescheduleSessionUseCase';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionAlreadyCompletedError,
  ChangeReasonRequiredError,
  TutorScheduleConflictError,
} from '@application/use-cases/sessions/SessionErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { Session, SessionWithParticipants } from '@domain/entities/Session';
import { RescheduleSessionInput } from '@application/dtos/session.dto';

describe('RescheduleSessionUseCase', () => {
  let useCase: RescheduleSessionUseCase;
  let sessions: jest.Mocked<SessionRepository>;

  const futureScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // mañana
  const baseSession = {
    id: 'session-1',
    tutorId: 'tutor-1',
    topic: 'Reforzamiento',
    scheduledAt: futureScheduledAt,
    durationMinutes: 45,
    endsAt: new Date(futureScheduledAt.getTime() + 45 * 60_000),
    modality: 'PRESENCIAL',
    location: 'Oficina 204',
    meetingLink: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    studentIds: ['student-1'],
    attendance: null,
  } as SessionWithParticipants;

  const baseInput: RescheduleSessionInput = {
    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    reason: 'El tutorado solicitó cambio de horario',
  };

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(baseSession),
      findOverlapping: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
      countAttendanceByTutorAndStudent: jest.fn(),
      createAttendance: jest.fn(),
      reschedule: jest.fn().mockImplementation(async (id, scheduledAt, endsAt) => ({
        ...baseSession,
        scheduledAt,
        endsAt,
      })),
      cancel: jest.fn(),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    useCase = new RescheduleSessionUseCase(sessions);
  });

  it('reprograma la sesión y registra la trazabilidad del cambio', async () => {
    await useCase.execute('session-1', 'tutor-1', baseInput);

    expect(sessions.reschedule).toHaveBeenCalledWith(
      'session-1',
      new Date(baseInput.scheduledAt),
      new Date(new Date(baseInput.scheduledAt).getTime() + 45 * 60_000),
    );
    expect(sessions.createChangeHistory).toHaveBeenCalledWith({
      sessionId: 'session-1',
      changeType: 'RESCHEDULE',
      reason: baseInput.reason,
      previousScheduledAt: baseSession.scheduledAt,
      newScheduledAt: new Date(baseInput.scheduledAt),
      changedById: 'tutor-1',
    });
  });

  it('excluye la propia sesión al validar solapamiento', async () => {
    await useCase.execute('session-1', 'tutor-1', baseInput);

    expect(sessions.findOverlapping).toHaveBeenCalledWith(
      'tutor-1',
      expect.any(Date),
      expect.any(Date),
      'session-1',
    );
  });

  it('lanza TutorScheduleConflictError si el nuevo horario choca con otra sesión', async () => {
    sessions.findOverlapping.mockResolvedValue([{ id: 'other' } as Session]);
    await expect(useCase.execute('session-1', 'tutor-1', baseInput)).rejects.toThrow(
      TutorScheduleConflictError,
    );
    expect(sessions.reschedule).not.toHaveBeenCalled();
  });

  it('lanza ChangeReasonRequiredError si no se indica motivo', async () => {
    await expect(
      useCase.execute('session-1', 'tutor-1', { ...baseInput, reason: '   ' }),
    ).rejects.toThrow(ChangeReasonRequiredError);
    expect(sessions.reschedule).not.toHaveBeenCalled();
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', baseInput)).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('lanza NotSessionTutorError si quien reprograma no es el tutor', async () => {
    await expect(useCase.execute('session-1', 'otro-tutor', baseInput)).rejects.toThrow(
      NotSessionTutorError,
    );
  });

  it('lanza SessionAlreadyCancelledError si la sesión ya fue cancelada', async () => {
    sessions.findById.mockResolvedValue({
      ...baseSession,
      cancelledAt: new Date(),
      cancelReason: 'Motivo previo',
    });
    await expect(useCase.execute('session-1', 'tutor-1', baseInput)).rejects.toThrow(
      SessionAlreadyCancelledError,
    );
  });

  it('lanza SessionAlreadyCompletedError si la sesión ya se realizó', async () => {
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000);
    sessions.findById.mockResolvedValue({
      ...baseSession,
      scheduledAt: new Date(pastEnd.getTime() - 45 * 60_000),
      endsAt: pastEnd,
    });
    await expect(useCase.execute('session-1', 'tutor-1', baseInput)).rejects.toThrow(
      SessionAlreadyCompletedError,
    );
  });
});
