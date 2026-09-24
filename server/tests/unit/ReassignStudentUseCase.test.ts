import { ReassignStudentUseCase } from '@application/use-cases/assignments/ReassignStudentUseCase';
import {
  ReassignReasonRequiredError,
  SameTutorAssignmentError,
  TutorNotFoundError,
} from '@application/use-cases/assignments/AssignmentErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

describe('ReassignStudentUseCase', () => {
  let useCase: ReassignStudentUseCase;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let history: jest.Mocked<TutorAssignmentHistoryRepository>;

  const tutorRole = { id: 'role-tutor', name: 'Docente Tutor' } as Role;
  const newTutor = { id: 'tutor-new', roleId: 'role-tutor', isActive: true } as User;
  const student = { id: 'student-1', tutorId: 'tutor-old' } as Student;

  beforeEach(() => {
    students = {
      findById: jest.fn().mockResolvedValue(student),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockImplementation(async (id, data) => ({ ...student, ...data, id })),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    users = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'tutor-old' ? ({ ...newTutor, id: 'tutor-old' } as User) : newTutor,
      ),
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
    history = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 'hist-1', createdAt: new Date(), ...data })),
      findByStudent: jest.fn(),
    };
    useCase = new ReassignStudentUseCase(students, users, roles, history);
  });

  it('reasigna al nuevo tutor y conserva el historial con el tutor anterior', async () => {
    const result = await useCase.execute('student-1', 'user-actor', {
      newTutorId: 'tutor-new',
      reason: 'Cambio de coordinación por carga de trabajo',
    });

    expect(result.tutorId).toBe('tutor-new');
    expect(students.update).toHaveBeenCalledWith('student-1', {
      tutorId: 'tutor-new',
      assignedAt: expect.any(Date),
    });
    expect(history.create).toHaveBeenCalledWith({
      studentId: 'student-1',
      previousTutorId: 'tutor-old',
      newTutorId: 'tutor-new',
      reason: 'Cambio de coordinación por carga de trabajo',
      reassignedById: 'user-actor',
    });
  });

  it('exige un motivo', async () => {
    await expect(
      useCase.execute('student-1', 'user-actor', { newTutorId: 'tutor-new', reason: '   ' }),
    ).rejects.toThrow(ReassignReasonRequiredError);
    expect(students.update).not.toHaveBeenCalled();
  });

  it('rechaza reasignar al mismo tutor', async () => {
    await expect(
      useCase.execute('student-1', 'user-actor', { newTutorId: 'tutor-old', reason: 'motivo' }),
    ).rejects.toThrow(SameTutorAssignmentError);
    expect(students.update).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(
      useCase.execute('missing', 'user-actor', { newTutorId: 'tutor-new', reason: 'motivo' }),
    ).rejects.toThrow(StudentNotFoundError);
  });

  it('lanza TutorNotFoundError si el nuevo tutor no es válido', async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      useCase.execute('student-1', 'user-actor', { newTutorId: 'tutor-x', reason: 'motivo' }),
    ).rejects.toThrow(TutorNotFoundError);
  });

  it('conserva previousTutorId nulo si el estudiante no tenía tutor', async () => {
    students.findById.mockResolvedValue({ ...student, tutorId: null });

    await useCase.execute('student-1', 'user-actor', { newTutorId: 'tutor-new', reason: 'Primera asignación formal' });

    expect(history.create).toHaveBeenCalledWith(
      expect.objectContaining({ previousTutorId: null }),
    );
  });
});
