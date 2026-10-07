import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorAssignmentHistory } from '@domain/entities/TutorAssignmentHistory';
import { SupportContact } from '@domain/entities/SupportContact';
import { SessionWithParticipants } from '@domain/entities/Session';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { allowAllGuard } from '../helpers/studentGuard';

describe('GetStudentRecordUseCase', () => {
  let useCase: GetStudentRecordUseCase;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let interviews: jest.Mocked<TutorInterviewRepository>;
  let history: jest.Mocked<TutorAssignmentHistoryRepository>;
  let contacts: jest.Mocked<SupportContactRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let followUps: jest.Mocked<TutorFollowUpRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let referrals: jest.Mocked<StudentReferralRepository>;

  const tutorRole = { id: 'role-tutor', name: 'Docente Tutor' } as Role;

  const student = {
    id: 'student-1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    cycle: 5,
    isActive: true,
    isAtRisk: false,
    riskReason: null,
    schoolId: 'school-1',
    tutorId: 'tutor-new',
  } as Student;

  const school = { id: 'school-1', name: 'Ingeniería de Sistemas' } as School;

  const tutorOld = { id: 'tutor-old', firstName: 'Jorge', lastName: 'Salazar', roleId: 'role-tutor' } as User;
  const tutorNew = { id: 'tutor-new', firstName: 'Elena', lastName: 'Ramírez', roleId: 'role-tutor' } as User;

  const interview = {
    id: 'interview-1',
    conductedById: 'tutor-new',
    motiveAcademic: true,
    motivePersonalEmotional: false,
    motiveVocational: false,
    aspectsDiscussed: 'Bajo rendimiento',
    agreements: 'Tutorías semanales',
    createdAt: new Date('2026-09-01'),
  } as TutorInterview;

  const assignment = {
    id: 'assign-1',
    previousTutorId: 'tutor-old',
    newTutorId: 'tutor-new',
    reason: 'Reorganización de carga',
    createdAt: new Date('2026-08-15'),
  } as TutorAssignmentHistory;

  beforeEach(() => {
    students = {
      findById: jest.fn().mockResolvedValue(student),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    schools = { findAll: jest.fn(), findById: jest.fn().mockResolvedValue(school) };
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'tutor-old' ? tutorOld : id === 'tutor-new' ? tutorNew : null,
      ),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    interviews = {
      create: jest.fn(),
      findByStudent: jest.fn().mockResolvedValue([interview]),
    };
    history = {
      create: jest.fn(),
      findByStudent: jest.fn().mockResolvedValue([assignment]),
    };
    contacts = {
      findByStudent: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
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
    followUps = {
      create: jest.fn(),
      findByStudent: jest.fn().mockResolvedValue([]),
      findByTutorBetween: jest.fn(),
    };
    roles = {
      findById: jest.fn().mockResolvedValue(tutorRole),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    referrals = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn(),
    };
    useCase = new GetStudentRecordUseCase(
      students,
      schools,
      users,
      roles,
      interviews,
      history,
      contacts,
      sessions,
      followUps,
      referrals,
      allowAllGuard(students),
    );
  });

  it('consolida entrevistas e historial de asignación en orden cronológico descendente', async () => {
    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(record.schoolName).toBe('Ingeniería de Sistemas');
    expect(record.tutorName).toBe('Elena Ramírez');
    expect(record.timeline).toHaveLength(2);
    // La entrevista (01-sep) es más reciente que la asignación (15-ago).
    expect(record.timeline[0].type).toBe('interview');
    expect(record.timeline[1].type).toBe('assignment');
    if (record.timeline[1].type === 'assignment') {
      expect(record.timeline[1].previousTutorName).toBe('Jorge Salazar');
      expect(record.timeline[1].newTutorName).toBe('Elena Ramírez');
    }
    if (record.timeline[0].type === 'interview') {
      expect(record.timeline[0].motives).toEqual(['Académica']);
      expect(record.timeline[0].conductedByName).toBe('Elena Ramírez');
    }
    expect(record.supportContact).toBeUndefined();
    expect(contacts.findByStudent).not.toHaveBeenCalled();
  });

  it('incluye la persona de red de apoyo solo si se solicita', async () => {
    contacts.findByStudent.mockResolvedValue({ fullName: 'María Torres' } as SupportContact);

    const record = await useCase.execute('student-1', true, 'tutor-new');

    expect(contacts.findByStudent).toHaveBeenCalledWith('student-1');
    expect(record.supportContact?.fullName).toBe('María Torres');
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', false, 'tutor-new')).rejects.toThrow(StudentNotFoundError);
  });

  it('incluye la asistencia confirmada de sesiones individuales (HU-22)', async () => {
    const attendedSession = {
      id: 'session-1',
      tutorId: 'tutor-new',
      topic: 'Reforzamiento de Cálculo',
      scheduledAt: new Date('2026-09-20T15:00:00.000Z'),
      durationMinutes: 45,
      endsAt: new Date('2026-09-20T15:45:00.000Z'),
      modality: 'PRESENCIAL',
      location: 'Oficina 204',
      meetingLink: null,
      createdAt: new Date('2026-09-15'),
      studentIds: ['student-1'],
      attendance: {
        id: 'att-1',
        sessionId: 'session-1',
        sequenceNumber: 1,
        confirmedAt: new Date('2026-09-20T15:45:00.000Z'),
        createdAt: new Date('2026-09-20T15:45:00.000Z'),
      },
    } as SessionWithParticipants;
    sessions.findByStudent.mockResolvedValue([attendedSession]);

    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(record.timeline).toHaveLength(3);
    const attendanceEvent = record.timeline.find((e) => e.type === 'attendance');
    expect(attendanceEvent).toBeDefined();
    if (attendanceEvent?.type === 'attendance') {
      expect(attendanceEvent.sequenceNumber).toBe(1);
      expect(attendanceEvent.topic).toBe('Reforzamiento de Cálculo');
      expect(attendanceEvent.tutorName).toBe('Elena Ramírez');
    }
  });

  it('incluye las fichas de seguimiento (HU-24)', async () => {
    followUps.findByStudent.mockResolvedValue([
      {
        id: 'followup-1',
        studentId: 'student-1',
        conductedById: 'tutor-new',
        reason: 'Bajo rendimiento en Cálculo',
        agreements: 'Reforzamiento semanal',
        instructorName: 'Prof. Juan Pérez',
        courseName: 'Cálculo I',
        courseCycle: 3,
        createdAt: new Date('2026-09-18'),
      },
    ]);

    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(record.timeline).toHaveLength(3);
    const followUpEvent = record.timeline.find((e) => e.type === 'followUp');
    expect(followUpEvent).toBeDefined();
    if (followUpEvent?.type === 'followUp') {
      expect(followUpEvent.reason).toBe('Bajo rendimiento en Cálculo');
      expect(followUpEvent.instructorName).toBe('Prof. Juan Pérez');
      expect(followUpEvent.courseCycle).toBe(3);
      expect(followUpEvent.conductedByName).toBe('Elena Ramírez');
    }
  });

  it('incluye las derivaciones que el propio tutor solicitante registró (HU-35)', async () => {
    const referral = {
      id: 'referral-1',
      studentId: 'student-1',
      referredById: 'tutor-new',
      checkedAspects: [],
      reason: 'Motivo confidencial',
      service: 'PSICOLOGIA',
      receivingInstance: 'Gabinete 3',
      status: 'ENVIADO',
      createdAt: new Date('2026-09-22'),
    } as StudentReferral;
    referrals.findMany.mockResolvedValue([referral]);

    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(referrals.findMany).toHaveBeenCalledWith({ studentId: 'student-1', referredById: 'tutor-new' });
    const referralEvent = record.timeline.find((e) => e.type === 'referral');
    expect(referralEvent).toBeDefined();
    if (referralEvent?.type === 'referral') {
      expect(referralEvent.service).toBe('PSICOLOGIA');
      expect(referralEvent.status).toBe('ENVIADO');
      expect(referralEvent.receivingInstance).toBe('Gabinete 3');
    }
    // No expone motivo ni aspectos observados en el expediente.
    expect(referralEvent).not.toHaveProperty('reason');
    expect(referralEvent).not.toHaveProperty('checkedAspects');
  });

  it('no incluye derivaciones para roles sin visibilidad de seguimiento (ej. Coordinador)', async () => {
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);
    referrals.findMany.mockResolvedValue([
      { id: 'referral-1', studentId: 'student-1', service: 'PSICOLOGIA', status: 'ENVIADO', createdAt: new Date() } as StudentReferral,
    ]);

    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(referrals.findMany).not.toHaveBeenCalled();
    expect(record.timeline.some((e) => e.type === 'referral')).toBe(false);
  });

  it('incluye todas las derivaciones del tutorado cuando el solicitante es Administrador DBU', async () => {
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);
    referrals.findMany.mockResolvedValue([
      { id: 'referral-1', studentId: 'student-1', service: 'SALUD', status: 'CERRADO', createdAt: new Date() } as StudentReferral,
    ]);

    const record = await useCase.execute('student-1', false, 'tutor-new');

    expect(referrals.findMany).toHaveBeenCalledWith({ studentId: 'student-1' });
    expect(record.timeline.some((e) => e.type === 'referral')).toBe(true);
  });
});
