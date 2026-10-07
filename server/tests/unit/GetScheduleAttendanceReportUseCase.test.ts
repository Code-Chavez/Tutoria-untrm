import { GetScheduleAttendanceReportUseCase } from '@application/use-cases/reports/GetScheduleAttendanceReportUseCase';
import { TutorNotFoundError } from '@application/use-cases/assignments/AssignmentErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { Student } from '@domain/entities/Student';
import { allowAllGuard } from '../helpers/studentGuard';

describe('GetScheduleAttendanceReportUseCase', () => {
  let useCase: GetScheduleAttendanceReportUseCase;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let students: jest.Mocked<StudentRepository>;

  const pastDate = new Date(Date.now() - 60 * 60 * 1000); // hace 1 hora
  const futureDate = new Date(Date.now() + 60 * 60 * 1000); // en 1 hora

  const tutorRole = { id: 'role-tutor', name: 'Docente Tutor' } as Role;
  const tutor = {
    id: 'tutor-1',
    firstName: 'Elena',
    lastName: 'Ramírez',
    roleId: 'role-tutor',
    isActive: true,
  } as User;

  const student1 = { id: 'student-1', firstName: 'Ana', lastName: 'Torres' } as Student;
  const student2 = { id: 'student-2', firstName: 'Luis', lastName: 'Pérez' } as Student;

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
      attendedStudentIds: [],
      absentStudentIds: [],
      attendance: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(tutor),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn().mockResolvedValue(tutorRole),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    sessions = {
      create: jest.fn(),
      findById: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findByStudent: jest.fn(),
      countAttendanceByTutorAndStudent: jest.fn(),
      createAttendance: jest.fn(),
      recordParticipantAttendance: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      createChangeHistory: jest.fn(),
      createEvidence: jest.fn(),
      listEvidenceBySession: jest.fn(),
      findEvidenceById: jest.fn(),
    };
    students = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'student-1' ? student1 : id === 'student-2' ? student2 : null,
      ),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    useCase = new GetScheduleAttendanceReportUseCase(users, roles, sessions, students, allowAllGuard(students));
  });

  it('lanza TutorNotFoundError si el tutor no existe o no es Docente Tutor', async () => {
    users.findById.mockResolvedValue(null);
    await expect(useCase.execute({ requesterId: 'admin-1', tutorId: 'missing' })).rejects.toThrow(TutorNotFoundError);
  });

  it('calcula los totales del periodo (individuales, grupales, canceladas, asistencia)', async () => {
    sessions.findAll.mockResolvedValue([
      makeSession({ id: 's1', attendance: null }), // individual, pendiente
      makeSession({
        id: 's2',
        attendance: {
          id: 'att-1',
          sessionId: 's2',
          sequenceNumber: 1,
          confirmedAt: pastDate,
          createdAt: pastDate,
        },
      }), // individual, confirmada
      makeSession({ id: 's3', studentIds: ['student-1', 'student-2'] }), // grupal
      makeSession({ id: 's4', cancelledAt: new Date() }), // cancelada
      makeSession({ id: 's5', scheduledAt: futureDate, endsAt: futureDate }), // futura, no pendiente aún
    ]);

    const report = await useCase.execute({ requesterId: 'admin-1', tutorId: 'tutor-1' });

    expect(report.totalSessions).toBe(5);
    expect(report.individualSessions).toBe(4);
    expect(report.groupSessions).toBe(1);
    expect(report.cancelledSessions).toBe(1);
    expect(report.attendanceConfirmed).toBe(1);
    expect(report.attendancePending).toBe(1); // solo s1: pasada, individual, sin cancelar, sin asistencia
  });

  it('resuelve los nombres de los tutorados y marca N/A la asistencia en sesiones grupales', async () => {
    sessions.findAll.mockResolvedValue([
      makeSession({ id: 's1', studentIds: ['student-1', 'student-2'] }),
    ]);

    const report = await useCase.execute({ requesterId: 'admin-1', tutorId: 'tutor-1' });

    expect(report.sessions[0].studentNames).toEqual(['Ana Torres', 'Luis Pérez']);
    expect(report.sessions[0].attendanceConfirmed).toBeNull();
  });

  it('filtra las sesiones fuera del periodo solicitado', async () => {
    const outOfRange = new Date('2020-01-01');
    sessions.findAll.mockResolvedValue([
      makeSession({ id: 'dentro', scheduledAt: pastDate }),
      makeSession({ id: 'fuera', scheduledAt: outOfRange, endsAt: outOfRange }),
    ]);

    const report = await useCase.execute({
      requesterId: 'admin-1',
      tutorId: 'tutor-1',
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    expect(report.sessions.map((s) => s.id)).toEqual(['dentro']);
  });

  it('ordena las sesiones de más reciente a más antigua', async () => {
    const older = new Date(pastDate.getTime() - 60 * 60 * 1000);
    sessions.findAll.mockResolvedValue([
      makeSession({ id: 'antigua', scheduledAt: older, endsAt: older }),
      makeSession({ id: 'reciente', scheduledAt: pastDate }),
    ]);

    const report = await useCase.execute({ requesterId: 'admin-1', tutorId: 'tutor-1' });

    expect(report.sessions.map((s) => s.id)).toEqual(['reciente', 'antigua']);
  });

  describe('estados según la asistencia registrada (A07)', () => {
    const run = async () => {
      sessions.findAll.mockResolvedValue([
        makeSession({ id: 'held', studentIds: ['student-1'], attendedStudentIds: ['student-1'] }),
        makeSession({ id: 'noshow', studentIds: ['student-2'], absentStudentIds: ['student-2'] }),
        makeSession({ id: 'pending', studentIds: ['student-1', 'student-2'] }),
        makeSession({ id: 'group', studentIds: ['student-1', 'student-2'], attendedStudentIds: ['student-2'], absentStudentIds: ['student-1'] }),
        makeSession({ id: 'cancelled', cancelledAt: new Date() }),
        makeSession({ id: 'future', scheduledAt: futureDate, endsAt: new Date(futureDate.getTime() + 45 * 60_000) }),
      ]);
      return useCase.execute({ requesterId: 'admin-1', tutorId: 'tutor-1' });
    };
    const status = (report: Awaited<ReturnType<typeof run>>, id: string) => report.sessions.find((s) => s.id === id)?.status;

    it('una sesión ya pasada no es «realizada» por haber pasado la hora', async () => {
      const report = await run();
      expect(status(report, 'held')).toBe('REALIZADA');
      expect(status(report, 'group')).toBe('REALIZADA');
      expect(status(report, 'noshow')).toBe('INASISTENCIA');
      expect(status(report, 'pending')).toBe('POR_REGISTRAR');
      expect(status(report, 'cancelled')).toBe('CANCELADA');
      expect(status(report, 'future')).toBe('PROXIMA');
    });

    it('los totales distinguen realizadas, sin asistentes y por registrar', async () => {
      const report = await run();
      expect(report).toMatchObject({ heldSessions: 2, noShowSessions: 1, pendingRollSessions: 1, cancelledSessions: 1 });
    });

    it('en la grupal indica cuántos de los programados asistieron y deja en blanco la que no se registró', async () => {
      const report = await run();
      const row = (id: string) => report.sessions.find((s) => s.id === id)!;
      expect(row('group')).toMatchObject({ attendedCount: 1, participantCount: 2 });
      expect(row('pending')).toMatchObject({ attendedCount: null, participantCount: 2 });
    });
  });
});
