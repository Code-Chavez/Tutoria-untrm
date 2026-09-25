import { RegisterAttendanceUseCase } from '@application/use-cases/sessions/RegisterAttendanceUseCase';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  GroupSessionAttendanceError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  AttendanceLimitReachedError,
  SessionAlreadyCancelledError,
} from '@application/use-cases/sessions/SessionErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { SystemParameter } from '@domain/entities/SystemParameter';

describe('RegisterAttendanceUseCase', () => {
  let useCase: RegisterAttendanceUseCase;
  let sessions: jest.Mocked<SessionRepository>;
  let systemParameters: jest.Mocked<SystemParameterRepository>;

  const pastDate = new Date(Date.now() - 60 * 60 * 1000); // hace 1 hora
  const futureDate = new Date(Date.now() + 60 * 60 * 1000); // en 1 hora

  const baseSession = {
    id: 'session-1',
    tutorId: 'tutor-1',
    topic: 'Reforzamiento',
    scheduledAt: pastDate,
    durationMinutes: 45,
    endsAt: new Date(pastDate.getTime() + 45 * 60_000),
    modality: 'PRESENCIAL',
    location: 'Oficina 204',
    meetingLink: null,
    createdAt: new Date(),
    studentIds: ['student-1'],
    attendance: null,
  } as SessionWithParticipants;

  beforeEach(() => {
    sessions = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(baseSession),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
      countAttendanceByTutorAndStudent: jest.fn().mockResolvedValue(0),
      createAttendance: jest.fn().mockImplementation(async (sessionId, sequenceNumber, confirmedAt) => ({
        id: 'att-1',
        sessionId,
        sequenceNumber,
        confirmedAt,
        createdAt: confirmedAt,
      })),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    systemParameters = {
      findByKey: jest
        .fn()
        .mockResolvedValue({ key: 'max_sessions_per_semester', value: '8' } as SystemParameter),
    };
    useCase = new RegisterAttendanceUseCase(sessions, systemParameters);
  });

  it('registra la asistencia con el número de sesión siguiente', async () => {
    sessions.countAttendanceByTutorAndStudent.mockResolvedValue(2);

    await useCase.execute('session-1', 'tutor-1');

    expect(sessions.createAttendance).toHaveBeenCalledWith('session-1', 3, expect.any(Date));
  });

  it('devuelve la sesión actualizada con la asistencia', async () => {
    sessions.findById
      .mockResolvedValueOnce(baseSession)
      .mockResolvedValueOnce({
        ...baseSession,
        attendance: { id: 'att-1', sessionId: 'session-1', sequenceNumber: 1, confirmedAt: new Date(), createdAt: new Date() },
      });

    const result = await useCase.execute('session-1', 'tutor-1');

    expect(result.attendance?.sequenceNumber).toBe(1);
  });

  it('lanza SessionNotFoundError si la sesión no existe', async () => {
    sessions.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1')).rejects.toThrow(SessionNotFoundError);
  });

  it('lanza NotSessionTutorError si quien registra no es el tutor de la sesión', async () => {
    await expect(useCase.execute('session-1', 'otro-tutor')).rejects.toThrow(NotSessionTutorError);
    expect(sessions.createAttendance).not.toHaveBeenCalled();
  });

  it('lanza SessionAlreadyCancelledError si la sesión fue cancelada', async () => {
    sessions.findById.mockResolvedValue({
      ...baseSession,
      cancelledAt: new Date(),
      cancelReason: 'El tutorado avisó que no podía asistir',
    });
    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(
      SessionAlreadyCancelledError,
    );
    expect(sessions.createAttendance).not.toHaveBeenCalled();
  });

  it('lanza GroupSessionAttendanceError para sesiones grupales', async () => {
    sessions.findById.mockResolvedValue({ ...baseSession, studentIds: ['s1', 's2'] });
    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(
      GroupSessionAttendanceError,
    );
  });

  it('lanza SessionNotStartedError si la sesión todavía no comienza', async () => {
    sessions.findById.mockResolvedValue({ ...baseSession, scheduledAt: futureDate });
    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(SessionNotStartedError);
  });

  it('lanza AttendanceAlreadyRegisteredError si ya tiene asistencia', async () => {
    sessions.findById.mockResolvedValue({
      ...baseSession,
      attendance: { id: 'att-1', sessionId: 'session-1', sequenceNumber: 1, confirmedAt: new Date(), createdAt: new Date() },
    });
    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(
      AttendanceAlreadyRegisteredError,
    );
  });

  it('lanza AttendanceLimitReachedError al llegar al máximo (8 por defecto)', async () => {
    sessions.countAttendanceByTutorAndStudent.mockResolvedValue(8);
    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(
      AttendanceLimitReachedError,
    );
    expect(sessions.createAttendance).not.toHaveBeenCalled();
  });

  it('usa el límite configurado en el parámetro del sistema', async () => {
    systemParameters.findByKey.mockResolvedValue({
      key: 'max_sessions_per_semester',
      value: '4',
    } as SystemParameter);
    sessions.countAttendanceByTutorAndStudent.mockResolvedValue(4);

    await expect(useCase.execute('session-1', 'tutor-1')).rejects.toThrow(
      AttendanceLimitReachedError,
    );
  });
});
