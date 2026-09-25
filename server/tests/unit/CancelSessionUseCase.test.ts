import { CancelSessionUseCase } from '@application/use-cases/sessions/CancelSessionUseCase';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionAlreadyCompletedError,
  ChangeReasonRequiredError,
} from '@application/use-cases/sessions/SessionErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { CancelSessionInput } from '@application/dtos/session.dto';

describe('CancelSessionUseCase', () => {
  let useCase: CancelSessionUseCase;
  let sessions: jest.Mocked<SessionRepository>;

  const futureScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
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

  const baseInput: CancelSessionInput = { reason: 'El tutor tuvo una emergencia' };

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(baseSession),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
      countAttendanceByTutorAndStudent: jest.fn(),
      createAttendance: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn().mockImplementation(async (id, cancelledAt, reason) => ({
        ...baseSession,
        cancelledAt,
        cancelReason: reason,
      })),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    useCase = new CancelSessionUseCase(sessions);
  });

  it('cancela la sesión y registra la trazabilidad del cambio', async () => {
    await useCase.execute('session-1', 'tutor-1', baseInput);

    expect(sessions.cancel).toHaveBeenCalledWith('session-1', expect.any(Date), baseInput.reason);
    expect(sessions.createChangeHistory).toHaveBeenCalledWith({
      sessionId: 'session-1',
      changeType: 'CANCEL',
      reason: baseInput.reason,
      previousScheduledAt: null,
      newScheduledAt: null,
      changedById: 'tutor-1',
    });
  });

  it('lanza ChangeReasonRequiredError si no se indica motivo', async () => {
    await expect(useCase.execute('session-1', 'tutor-1', { reason: '  ' })).rejects.toThrow(
      ChangeReasonRequiredError,
    );
    expect(sessions.cancel).not.toHaveBeenCalled();
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', baseInput)).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('lanza NotSessionTutorError si quien cancela no es el tutor', async () => {
    await expect(useCase.execute('session-1', 'otro-tutor', baseInput)).rejects.toThrow(
      NotSessionTutorError,
    );
  });

  it('lanza SessionAlreadyCancelledError si ya estaba cancelada', async () => {
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
