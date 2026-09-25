import { CreateOwnTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateOwnTutoringRequestUseCase';
import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { TutoringRequest } from '@domain/entities/TutoringRequest';
import { CreateOwnTutoringRequestInput } from '@application/dtos/tutoringRequest.dto';

describe('CreateOwnTutoringRequestUseCase', () => {
  let useCase: CreateOwnTutoringRequestUseCase;
  let students: jest.Mocked<StudentRepository>;
  let createTutoringRequestUseCase: jest.Mocked<Pick<CreateTutoringRequestUseCase, 'execute'>>;

  const linkedStudent = { id: 'student-1', userId: 'user-1' } as Student;
  const baseInput: CreateOwnTutoringRequestInput = {
    caseType: 'ACADEMIC',
    reason: 'Dificultad en el curso de Cálculo',
  };

  beforeEach(() => {
    students = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(linkedStudent),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    createTutoringRequestUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'req-1' } as TutoringRequest),
    };

    useCase = new CreateOwnTutoringRequestUseCase(
      students,
      createTutoringRequestUseCase as unknown as CreateTutoringRequestUseCase,
    );
  });

  it('resuelve el estudiante a partir de la cuenta autenticada y delega el enrutamiento', async () => {
    await useCase.execute('user-1', baseInput);

    expect(students.findByUserId).toHaveBeenCalledWith('user-1');
    expect(createTutoringRequestUseCase.execute).toHaveBeenCalledWith('student-1', 'user-1', {
      source: 'STUDENT',
      caseType: 'ACADEMIC',
      reason: 'Dificultad en el curso de Cálculo',
    });
  });

  it('lanza StudentProfileNotLinkedError si la cuenta no está vinculada a ningún estudiante', async () => {
    students.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('user-sin-vinculo', baseInput)).rejects.toThrow(
      StudentProfileNotLinkedError,
    );
    expect(createTutoringRequestUseCase.execute).not.toHaveBeenCalled();
  });
});
