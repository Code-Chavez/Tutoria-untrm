import { LinkStudentPortalAccountUseCase } from '@application/use-cases/students/LinkStudentPortalAccountUseCase';
import {
  StudentNotFoundError,
  PortalUserNotFoundError,
  PortalUserRoleMismatchError,
  PortalUserAlreadyLinkedError,
} from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

describe('LinkStudentPortalAccountUseCase', () => {
  let useCase: LinkStudentPortalAccountUseCase;
  let mockStudentRepository: jest.Mocked<StudentRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockRoleRepository: jest.Mocked<RoleRepository>;

  const baseStudent: Student = {
    id: 'student-1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    email: null,
    phone: null,
    cycle: 5,
    isAtRisk: false,
    isActive: true,
    schoolId: 'school-1',
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentUser: User = {
    id: 'user-1',
    email: '20191234@untrm.edu.pe',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Torres',
    roleId: 'role-student',
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentRole: Role = {
    id: 'role-student',
    name: 'Tutorado',
    description: 'Estudiante tutorado',
    permissions: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockStudentRepository = {
      findById: jest.fn().mockResolvedValue(baseStudent),
      findByCode: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockImplementation(async (id, data) => ({ ...baseStudent, ...data, id })),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn().mockResolvedValue(studentUser),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockRoleRepository = {
      findById: jest.fn().mockResolvedValue(studentRole),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };

    useCase = new LinkStudentPortalAccountUseCase(
      mockStudentRepository,
      mockUserRepository,
      mockRoleRepository,
    );
  });

  it('vincula la cuenta cuando el usuario existe, tiene rol Tutorado y no está vinculado a otro estudiante', async () => {
    const result = await useCase.execute('student-1', 'user-1');

    expect(result.userId).toBe('user-1');
    expect(mockStudentRepository.update).toHaveBeenCalledWith('student-1', { userId: 'user-1' });
  });

  it('desvincula la cuenta cuando userId es null, sin validar rol', async () => {
    await useCase.execute('student-1', null);

    expect(mockStudentRepository.update).toHaveBeenCalledWith('student-1', { userId: null });
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    mockStudentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(StudentNotFoundError);
  });

  it('lanza PortalUserNotFoundError si la cuenta no existe', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('student-1', 'missing')).rejects.toThrow(PortalUserNotFoundError);
  });

  it('lanza PortalUserRoleMismatchError si la cuenta no tiene rol Tutorado', async () => {
    mockRoleRepository.findById.mockResolvedValue({ ...studentRole, name: 'Coordinador' });

    await expect(useCase.execute('student-1', 'user-1')).rejects.toThrow(
      PortalUserRoleMismatchError,
    );
  });

  it('lanza PortalUserAlreadyLinkedError si la cuenta ya está vinculada a otro estudiante', async () => {
    mockStudentRepository.findByUserId.mockResolvedValue({ ...baseStudent, id: 'student-2' });

    await expect(useCase.execute('student-1', 'user-1')).rejects.toThrow(
      PortalUserAlreadyLinkedError,
    );
  });

  it('permite re-vincular la misma cuenta al mismo estudiante', async () => {
    mockStudentRepository.findByUserId.mockResolvedValue({ ...baseStudent, id: 'student-1' });

    await expect(useCase.execute('student-1', 'user-1')).resolves.not.toThrow();
  });
});
