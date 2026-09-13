import { CreateStudentUseCase } from '@application/use-cases/students/CreateStudentUseCase';
import {
  DuplicateStudentCodeError,
  SchoolNotFoundError,
} from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';

describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;
  let mockStudentRepository: jest.Mocked<StudentRepository>;
  let mockSchoolRepository: jest.Mocked<SchoolRepository>;

  const school: School = {
    id: 'school-123',
    name: 'Ingeniería de Sistemas',
    facultyId: 'faculty-123',
    isActive: true,
    createdAt: new Date(),
  };

  const validInput = {
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    email: 'ana@untrm.edu.pe',
    phone: '987654321',
    cycle: 5,
    schoolId: 'school-123',
  };

  beforeEach(() => {
    mockStudentRepository = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockSchoolRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    useCase = new CreateStudentUseCase(mockStudentRepository, mockSchoolRepository);
  });

  it('debería registrar un estudiante exitosamente', async () => {
    mockSchoolRepository.findById.mockResolvedValue(school);
    mockStudentRepository.findByCode.mockResolvedValue(null);
    mockStudentRepository.create.mockImplementation(async (data) => ({
      id: 'student-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Student));

    const result = await useCase.execute(validInput);

    expect(mockSchoolRepository.findById).toHaveBeenCalledWith('school-123');
    expect(mockStudentRepository.findByCode).toHaveBeenCalledWith('20191234');
    expect(mockStudentRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('student-123');
    expect(result.isActive).toBe(true);
    expect(result.isAtRisk).toBe(false);
  });

  it('debería lanzar SchoolNotFoundError si la escuela no existe', async () => {
    mockSchoolRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(SchoolNotFoundError);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });

  it('debería lanzar DuplicateStudentCodeError si el código ya existe', async () => {
    mockSchoolRepository.findById.mockResolvedValue(school);
    mockStudentRepository.findByCode.mockResolvedValue({
      id: 'existing-123',
      studentCode: '20191234',
    } as Student);

    await expect(useCase.execute(validInput)).rejects.toThrow(DuplicateStudentCodeError);
    expect(mockStudentRepository.create).not.toHaveBeenCalled();
  });
});
