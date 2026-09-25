import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { Student } from '@domain/entities/Student';
import { SessionWithParticipants } from '@domain/entities/Session';
import { User } from '@domain/entities/User';
import { SystemParameter } from '@domain/entities/SystemParameter';

describe('GetRiskAlertsUseCase', () => {
  let useCase: GetRiskAlertsUseCase;
  let students: jest.Mocked<StudentRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let users: jest.Mocked<UserRepository>;
  let systemParameters: jest.Mocked<SystemParameterRepository>;

  const pastDate = new Date(Date.now() - 60 * 60 * 1000); // hace 1 hora
  const futureDate = new Date(Date.now() + 60 * 60 * 1000); // en 1 hora

  function makeStudent(overrides: Partial<Student> = {}): Student {
    return {
      id: 'student-1',
      studentCode: '20191234',
      firstName: 'Ana',
      lastName: 'Torres',
      cycle: 5,
      isAtRisk: true,
      riskReason: 'Bajo rendimiento',
      isActive: true,
      schoolId: 'school-1',
      tutorId: 'tutor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function makeSession(overrides: Partial<SessionWithParticipants> = {}): SessionWithParticipants {
    return {
      id: 'session-1',
      tutorId: 'tutor-1',
      topic: 'Reforzamiento',
      scheduledAt: pastDate,
      durationMinutes: 45,
      endsAt: pastDate,
      modality: 'PRESENCIAL',
      location: 'Oficina 204',
      meetingLink: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date(),
      studentIds: ['student-1'],
      attendance: null,
      ...overrides,
    };
  }

  const tutor = { id: 'tutor-1', firstName: 'Elena', lastName: 'Ramírez' } as User;

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    sessions = {
      create: jest.fn(),
      findById: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      findByStudent: jest.fn().mockResolvedValue([]),
      countAttendanceByTutorAndStudent: jest.fn(),
      createAttendance: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    users = {
      findById: jest.fn().mockResolvedValue(tutor),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    systemParameters = {
      findByKey: jest
        .fn()
        .mockResolvedValue({ key: 'absence_alert_threshold', value: '2' } as SystemParameter),
    };
    useCase = new GetRiskAlertsUseCase(students, sessions, users, systemParameters);
  });

  it('no genera alertas cuando no hay tutorados en riesgo', async () => {
    students.findAll.mockResolvedValue([]);
    const result = await useCase.execute();
    expect(result).toEqual([]);
    expect(sessions.findByStudent).not.toHaveBeenCalled();
  });

  it('alerta NO_SESSIONS cuando el tutorado en riesgo no tiene ninguna sesión', async () => {
    students.findAll.mockResolvedValue([makeStudent()]);
    sessions.findByStudent.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([
      expect.objectContaining({
        type: 'NO_SESSIONS',
        studentId: 'student-1',
        tutorName: 'Elena Ramírez',
      }),
    ]);
  });

  it('no genera alerta si las sesiones pasadas sin asistencia están bajo el umbral', async () => {
    students.findAll.mockResolvedValue([makeStudent()]);
    sessions.findByStudent.mockResolvedValue([makeSession()]); // 1 sesión sin asistencia, umbral 2

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('alerta MISSED_SESSIONS al alcanzar el umbral de inasistencias', async () => {
    students.findAll.mockResolvedValue([makeStudent()]);
    sessions.findByStudent.mockResolvedValue([
      makeSession({ id: 's1' }),
      makeSession({ id: 's2' }),
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      expect.objectContaining({ type: 'MISSED_SESSIONS', missedCount: 2 }),
    ]);
  });

  it('no cuenta como inasistencia una sesión grupal, cancelada, futura o ya asistida', async () => {
    students.findAll.mockResolvedValue([makeStudent()]);
    sessions.findByStudent.mockResolvedValue([
      makeSession({ id: 'grupal', studentIds: ['student-1', 'student-2'] }),
      makeSession({ id: 'cancelada', cancelledAt: new Date() }),
      makeSession({ id: 'futura', scheduledAt: futureDate }),
      makeSession({
        id: 'con-asistencia',
        attendance: {
          id: 'att-1',
          sessionId: 'con-asistencia',
          sequenceNumber: 1,
          confirmedAt: pastDate,
          createdAt: pastDate,
        },
      }),
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('usa el umbral configurado en el parámetro del sistema', async () => {
    systemParameters.findByKey.mockResolvedValue({
      key: 'absence_alert_threshold',
      value: '1',
    } as SystemParameter);
    students.findAll.mockResolvedValue([makeStudent()]);
    sessions.findByStudent.mockResolvedValue([makeSession()]);

    const result = await useCase.execute();

    expect(result).toEqual([expect.objectContaining({ type: 'MISSED_SESSIONS', missedCount: 1 })]);
  });

  it('filtra por tutorId cuando se pide el panel de un tutor específico', async () => {
    await useCase.execute({ tutorId: 'tutor-1' });
    expect(students.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ isAtRisk: true, tutorId: 'tutor-1' }),
    );
  });

  it('ordena NO_SESSIONS antes que MISSED_SESSIONS, y estas por cantidad descendente', async () => {
    students.findAll.mockResolvedValue([
      makeStudent({ id: 'student-missed-low' }),
      makeStudent({ id: 'student-none' }),
      makeStudent({ id: 'student-missed-high' }),
    ]);
    sessions.findByStudent.mockImplementation(async (studentId: string) => {
      if (studentId === 'student-none') return [];
      if (studentId === 'student-missed-high') {
        return [makeSession({ id: 'a' }), makeSession({ id: 'b' }), makeSession({ id: 'c' })];
      }
      return [makeSession({ id: 'd' }), makeSession({ id: 'e' })];
    });

    const result = await useCase.execute();

    expect(result.map((a) => a.studentId)).toEqual([
      'student-none',
      'student-missed-high',
      'student-missed-low',
    ]);
  });
});
