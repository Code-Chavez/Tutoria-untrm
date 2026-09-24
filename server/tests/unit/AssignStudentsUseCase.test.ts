import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import {
  TutorNotFoundError,
  NoStudentsSelectedError,
} from '@application/use-cases/assignments/AssignmentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

describe('AssignStudentsUseCase', () => {
  let useCase: AssignStudentsUseCase;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;

  const tutorRole = { id: 'role-tutor', name: 'Docente Tutor' } as Role;
  const tutor = { id: 'tutor-1', roleId: 'role-tutor', isActive: true } as User;

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn().mockResolvedValue(2),
      countByTutor: jest.fn(),
    };
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
    useCase = new AssignStudentsUseCase(students, users, roles);
  });

  it('asigna estudiantes a un tutor válido y registra la fecha', async () => {
    const result = await useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1', 's2', 's2'] });

    expect(result.assigned).toBe(2);
    // Deduplica ids antes de asignar.
    expect(students.assignTutor).toHaveBeenCalledWith(['s1', 's2'], 'tutor-1', expect.any(Date));
  });

  it('rechaza cuando no hay estudiantes seleccionados', async () => {
    await expect(useCase.execute({ tutorId: 'tutor-1', studentIds: [] })).rejects.toThrow(
      NoStudentsSelectedError,
    );
    expect(students.assignTutor).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no es un Docente Tutor', async () => {
    users.findById.mockResolvedValue({ ...tutor, roleId: 'role-otro' } as User);

    await expect(
      useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1'] }),
    ).rejects.toThrow(TutorNotFoundError);
  });

  it('rechaza si el tutor está inactivo', async () => {
    users.findById.mockResolvedValue({ ...tutor, isActive: false } as User);

    await expect(
      useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1'] }),
    ).rejects.toThrow(TutorNotFoundError);
  });
});
