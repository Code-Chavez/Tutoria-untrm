import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import {
  TutorScheduleConflictError,
  LocationRequiredError,
  MeetingLinkRequiredError,
} from '@application/use-cases/sessions/SessionErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { Student } from '@domain/entities/Student';
import { Session, SessionWithParticipants } from '@domain/entities/Session';
import { SystemParameter } from '@domain/entities/SystemParameter';
import { ScheduleSessionInput } from '@application/dtos/session.dto';

describe('ScheduleSessionUseCase', () => {
  let useCase: ScheduleSessionUseCase;
  let sessions: jest.Mocked<SessionRepository>;
  let students: jest.Mocked<StudentRepository>;
  let systemParameters: jest.Mocked<SystemParameterRepository>;

  const baseInput: ScheduleSessionInput = {
    studentIds: ['student-1'],
    topic: 'Reforzamiento de Cálculo',
    scheduledAt: '2026-10-01T15:00:00.000Z',
    modality: 'PRESENCIAL',
    location: 'Oficina de tutoría 204',
  };

  beforeEach(() => {
    sessions = {
      create: jest.fn().mockImplementation(async (data, studentIds) => ({
        id: 'session-1',
        createdAt: new Date(),
        studentIds,
        ...data,
      } as SessionWithParticipants)),
      findOverlapping: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
    };
    students = {
      findById: jest.fn().mockImplementation(async (id: string) => ({ id } as Student)),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    systemParameters = {
      findByKey: jest
        .fn()
        .mockResolvedValue({ key: 'session_duration_minutes', value: '45' } as SystemParameter),
    };
    useCase = new ScheduleSessionUseCase(sessions, students, systemParameters);
  });

  it('programa la sesión con la duración configurada (45 min) y calcula el fin', async () => {
    const result = await useCase.execute('tutor-1', baseInput);

    expect(result.durationMinutes).toBe(45);
    expect(result.endsAt.toISOString()).toBe('2026-10-01T15:45:00.000Z');
    expect(result.studentIds).toEqual(['student-1']);
    expect(sessions.findOverlapping).toHaveBeenCalledWith(
      'tutor-1',
      new Date('2026-10-01T15:00:00.000Z'),
      new Date('2026-10-01T15:45:00.000Z'),
    );
  });

  it('usa 45 minutos por defecto si el parámetro del sistema no existe', async () => {
    systemParameters.findByKey.mockResolvedValue(null);

    const result = await useCase.execute('tutor-1', baseInput);

    expect(result.durationMinutes).toBe(45);
  });

  it('rechaza la sesión si el tutor tiene otra que se solapa', async () => {
    sessions.findOverlapping.mockResolvedValue([{ id: 'other-session' } as Session]);

    await expect(useCase.execute('tutor-1', baseInput)).rejects.toThrow(
      TutorScheduleConflictError,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);

    await expect(useCase.execute('tutor-1', baseInput)).rejects.toThrow(StudentNotFoundError);
    expect(sessions.findOverlapping).not.toHaveBeenCalled();
  });

  it('programa una sesión grupal con dos o más tutorados (Art. 7.b)', async () => {
    const result = await useCase.execute('tutor-1', {
      ...baseInput,
      studentIds: ['student-1', 'student-2', 'student-3'],
    });

    expect(result.studentIds).toEqual(['student-1', 'student-2', 'student-3']);
    expect(sessions.create).toHaveBeenCalledWith(
      expect.anything(),
      ['student-1', 'student-2', 'student-3'],
    );
  });

  it('lanza StudentNotFoundError si alguno de los tutorados de una sesión grupal no existe', async () => {
    students.findById.mockImplementation(async (id: string) =>
      id === 'student-2' ? null : ({ id } as Student),
    );

    await expect(
      useCase.execute('tutor-1', { ...baseInput, studentIds: ['student-1', 'student-2'] }),
    ).rejects.toThrow(StudentNotFoundError);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('guarda el lugar en una sesión presencial (Art. 8.c)', async () => {
    const result = await useCase.execute('tutor-1', baseInput);

    expect(result.modality).toBe('PRESENCIAL');
    expect(result.location).toBe('Oficina de tutoría 204');
    expect(result.meetingLink).toBeNull();
  });

  it('lanza LocationRequiredError si la sesión presencial no indica lugar', async () => {
    await expect(
      useCase.execute('tutor-1', { ...baseInput, location: '  ' }),
    ).rejects.toThrow(LocationRequiredError);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('guarda el enlace en una sesión virtual (Art. 8.d)', async () => {
    const result = await useCase.execute('tutor-1', {
      ...baseInput,
      modality: 'VIRTUAL',
      location: undefined,
      meetingLink: 'https://meet.example.com/abc',
    });

    expect(result.modality).toBe('VIRTUAL');
    expect(result.meetingLink).toBe('https://meet.example.com/abc');
    expect(result.location).toBeNull();
  });

  it('lanza MeetingLinkRequiredError si la sesión virtual no indica enlace', async () => {
    await expect(
      useCase.execute('tutor-1', { ...baseInput, modality: 'VIRTUAL', location: undefined }),
    ).rejects.toThrow(MeetingLinkRequiredError);
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
