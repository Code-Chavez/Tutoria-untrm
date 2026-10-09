import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import {
  TutorNotFoundError,
  NoStudentsSelectedError,
  StudentsAlreadyAssignedError,
} from '@application/use-cases/assignments/AssignmentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { Student } from '@domain/entities/Student';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { allowAllGuard } from '../helpers/studentGuard';

describe('AssignStudentsUseCase', () => {
  let useCase: AssignStudentsUseCase;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;

  const tutorRole = { id: 'role-tutor', name: 'Docente Tutor' } as Role;
  const tutor = { id: 'tutor-1', roleId: 'role-tutor', isActive: true } as User;

  // Tutorados sin tutor y dentro del alcance de quien asigna.
  const unassigned = (id: string) => ({ id, schoolId: 'school-1', tutorId: null }) as unknown as Student;

  beforeEach(() => {
    students = {
      findById: jest.fn().mockImplementation(async (id: string) => unassigned(id)),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
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
    useCase = new AssignStudentsUseCase(students, users, roles, allowAllGuard(students));
  });

  it('asigna estudiantes a un tutor válido y registra la fecha', async () => {
    const result = await useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1', 's2', 's2'] }, 'admin-1');

    expect(result.assigned).toBe(2);
    // Deduplica ids antes de asignar.
    expect(students.assignTutor).toHaveBeenCalledWith(['s1', 's2'], 'tutor-1', expect.any(Date));
  });

  it('rechaza cuando no hay estudiantes seleccionados', async () => {
    await expect(useCase.execute({ tutorId: 'tutor-1', studentIds: [] }, 'admin-1')).rejects.toThrow(
      NoStudentsSelectedError,
    );
    expect(students.assignTutor).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario no es un Docente Tutor', async () => {
    users.findById.mockResolvedValue({ ...tutor, roleId: 'role-otro' } as User);

    await expect(
      useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1'] }, 'admin-1'),
    ).rejects.toThrow(TutorNotFoundError);
  });

  it('rechaza si el tutor está inactivo', async () => {
    users.findById.mockResolvedValue({ ...tutor, isActive: false } as User);

    await expect(
      useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1'] }, 'admin-1'),
    ).rejects.toThrow(TutorNotFoundError);
  });

  describe('alcance y asignación inicial', () => {
    it('rechaza a los tutorados que ya tienen tutor y pide usar la reasignación con motivo', async () => {
      students.findById.mockImplementation(async (id: string) =>
        id === 's2' ? ({ ...unassigned(id), tutorId: 'otro-tutor' } as Student) : unassigned(id),
      );

      const error = await useCase.execute({ tutorId: 'tutor-1', studentIds: ['s1', 's2'] }, 'coord-1').catch((e) => e);

      expect(error).toBeInstanceOf(StudentsAlreadyAssignedError);
      expect(error.message).toMatch(/reasignación/);
      expect(students.assignTutor).not.toHaveBeenCalled(); // ni siquiera asigna a s1
    });

    it('no asigna si algún tutorado queda fuera del alcance de quien asigna, y no revela que existe', async () => {
      const guard = allowAllGuard(students);
      guard.assertAccessToAll.mockRejectedValue(new StudentNotFoundError('s2'));
      const scoped = new AssignStudentsUseCase(students, users, roles, guard);

      await expect(scoped.execute({ tutorId: 'tutor-1', studentIds: ['s1', 's2'] }, 'coord-A')).rejects.toBeInstanceOf(StudentNotFoundError);
      expect(guard.assertAccessToAll).toHaveBeenCalledWith('coord-A', ['s1', 's2']);
      expect(students.assignTutor).not.toHaveBeenCalled();
    });
  });
});
