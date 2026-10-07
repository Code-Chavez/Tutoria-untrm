import { RecordSessionAttendanceUseCase } from '@application/use-cases/sessions/RecordSessionAttendanceUseCase';
import {
  SessionNotFoundError,
  NotSessionTutorError,
  SessionAlreadyCancelledError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  InvalidAttendeesError,
  IndividualAttendanceViaConfirmationError,
} from '@application/use-cases/sessions/SessionErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { SessionWithParticipants } from '@domain/entities/Session';

describe('RecordSessionAttendanceUseCase (A07)', () => {
  let sessions: jest.Mocked<SessionRepository>;
  let useCase: RecordSessionAttendanceUseCase;

  const past = new Date(Date.now() - 2 * 3_600_000);
  const group = {
    id: 'g1', tutorId: 'tutor-1', studentIds: ['a', 'b', 'c', 'd', 'e'], attendedStudentIds: [], absentStudentIds: [],
    scheduledAt: past, endsAt: new Date(past.getTime() + 45 * 60_000), cancelledAt: null, attendance: null,
  } as unknown as SessionWithParticipants;
  const individual = { ...group, id: 'i1', studentIds: ['a'] } as SessionWithParticipants;

  beforeEach(() => {
    sessions = {
      findById: jest.fn().mockResolvedValue(group),
      recordParticipantAttendance: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionRepository>;
    useCase = new RecordSessionAttendanceUseCase(sessions);
  });

  it('en una grupal marca como asistidos a los listados y como inasistentes al resto', async () => {
    await useCase.execute('g1', 'tutor-1', ['a', 'b']);
    expect(sessions.recordParticipantAttendance).toHaveBeenCalledWith('g1', ['a', 'b'], ['c', 'd', 'e']);
  });

  it('acepta que nadie asistiera y descarta repetidos', async () => {
    await useCase.execute('g1', 'tutor-1', []);
    expect(sessions.recordParticipantAttendance).toHaveBeenCalledWith('g1', [], ['a', 'b', 'c', 'd', 'e']);

    await useCase.execute('g1', 'tutor-1', ['a', 'a']);
    expect(sessions.recordParticipantAttendance).toHaveBeenLastCalledWith('g1', ['a'], ['b', 'c', 'd', 'e']);
  });

  it('permite corregir un registro anterior', async () => {
    sessions.findById.mockResolvedValue({ ...group, attendedStudentIds: ['a'], absentStudentIds: ['b', 'c', 'd', 'e'] } as SessionWithParticipants);
    await expect(useCase.execute('g1', 'tutor-1', ['a', 'b'])).resolves.toBeDefined();
  });

  it('rechaza a quien no es participante de la sesión', async () => {
    await expect(useCase.execute('g1', 'tutor-1', ['a', 'intruso'])).rejects.toBeInstanceOf(InvalidAttendeesError);
    expect(sessions.recordParticipantAttendance).not.toHaveBeenCalled();
  });

  it('solo el tutor de la sesión la registra', async () => {
    await expect(useCase.execute('g1', 'otro-tutor', ['a'])).rejects.toBeInstanceOf(NotSessionTutorError);
    expect(sessions.recordParticipantAttendance).not.toHaveBeenCalled();
  });

  it('no registra una sesión cancelada, una que no existe ni una que aún no empieza', async () => {
    sessions.findById.mockResolvedValueOnce({ ...group, cancelledAt: new Date() } as SessionWithParticipants);
    await expect(useCase.execute('g1', 'tutor-1', ['a'])).rejects.toBeInstanceOf(SessionAlreadyCancelledError);

    sessions.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('nope', 'tutor-1', ['a'])).rejects.toBeInstanceOf(SessionNotFoundError);

    const future = new Date(Date.now() + 3_600_000);
    sessions.findById.mockResolvedValueOnce({ ...group, scheduledAt: future, endsAt: future } as SessionWithParticipants);
    await expect(useCase.execute('g1', 'tutor-1', ['a'])).rejects.toBeInstanceOf(SessionNotStartedError);
    expect(sessions.recordParticipantAttendance).not.toHaveBeenCalled();
  });

  describe('sesión individual', () => {
    beforeEach(() => sessions.findById.mockResolvedValue(individual));

    it('permite marcar la inasistencia', async () => {
      await useCase.execute('i1', 'tutor-1', []);
      expect(sessions.recordParticipantAttendance).toHaveBeenCalledWith('i1', [], ['a']);
    });

    it('la asistencia se confirma con el número del Anexo N°4, no por esta vía', async () => {
      await expect(useCase.execute('i1', 'tutor-1', ['a'])).rejects.toBeInstanceOf(IndividualAttendanceViaConfirmationError);
    });

    it('no se marca la inasistencia de una sesión cuya asistencia ya fue confirmada', async () => {
      sessions.findById.mockResolvedValue({ ...individual, attendance: { id: 'att' } } as unknown as SessionWithParticipants);
      await expect(useCase.execute('i1', 'tutor-1', [])).rejects.toBeInstanceOf(AttendanceAlreadyRegisteredError);
    });
  });
});
