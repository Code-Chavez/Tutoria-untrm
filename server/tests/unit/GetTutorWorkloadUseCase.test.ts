import { GetTutorWorkloadUseCase } from '@application/use-cases/assignments/GetTutorWorkloadUseCase';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

describe('GetTutorWorkloadUseCase', () => {
  let useCase: GetTutorWorkloadUseCase;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn().mockResolvedValue([{ tutorId: 't1', count: 5 }]),
    };
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn().mockResolvedValue([
        { id: 't1', firstName: 'Juan', lastName: 'Pérez', email: 'juan@untrm.edu.pe' } as User,
        { id: 't2', firstName: 'Ana', lastName: 'Ruiz', email: 'ana@untrm.edu.pe' } as User,
      ]),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn().mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    useCase = new GetTutorWorkloadUseCase(students, users, roles);
  });

  it('devuelve tutores con su carga, ordenados de menor a mayor', async () => {
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    // t2 (0) va antes que t1 (5)
    expect(result[0]).toEqual({ tutorId: 't2', fullName: 'Ana Ruiz', email: 'ana@untrm.edu.pe', assignedCount: 0 });
    expect(result[1].assignedCount).toBe(5);
  });

  it('devuelve vacío si no existe el rol de tutor', async () => {
    roles.findByName.mockResolvedValue(null);
    expect(await useCase.execute()).toEqual([]);
  });
});
