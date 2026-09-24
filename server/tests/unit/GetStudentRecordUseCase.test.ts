import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { User } from '@domain/entities/User';
import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorAssignmentHistory } from '@domain/entities/TutorAssignmentHistory';
import { SupportContact } from '@domain/entities/SupportContact';

describe('GetStudentRecordUseCase', () => {
  let useCase: GetStudentRecordUseCase;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let interviews: jest.Mocked<TutorInterviewRepository>;
  let history: jest.Mocked<TutorAssignmentHistoryRepository>;
  let contacts: jest.Mocked<SupportContactRepository>;

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

  const tutorOld = { id: 'tutor-old', firstName: 'Jorge', lastName: 'Salazar' } as User;
  const tutorNew = { id: 'tutor-new', firstName: 'Elena', lastName: 'Ramírez' } as User;

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
    useCase = new GetStudentRecordUseCase(students, schools, users, interviews, history, contacts);
  });

  it('consolida entrevistas e historial de asignación en orden cronológico descendente', async () => {
    const record = await useCase.execute('student-1', false);

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

    const record = await useCase.execute('student-1', true);

    expect(contacts.findByStudent).toHaveBeenCalledWith('student-1');
    expect(record.supportContact?.fullName).toBe('María Torres');
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', false)).rejects.toThrow(StudentNotFoundError);
  });
});
