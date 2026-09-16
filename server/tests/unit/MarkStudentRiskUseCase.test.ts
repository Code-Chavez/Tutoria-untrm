import { MarkStudentRiskUseCase } from '@application/use-cases/students/MarkStudentRiskUseCase';
import {
  StudentNotFoundError,
  RiskReasonRequiredError,
} from '@application/use-cases/students/StudentErrors';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';

describe('MarkStudentRiskUseCase', () => {
  let useCase: MarkStudentRiskUseCase;
  let mockStudentRepository: jest.Mocked<StudentRepository>;

  const baseStudent: Student = {
    id: 'student-1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    email: null,
    phone: null,
    cycle: 5,
    isAtRisk: false,
    riskReason: null,
    riskMarkedAt: null,
    isActive: true,
    schoolId: 'school-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockStudentRepository = {
      findById: jest.fn().mockResolvedValue(baseStudent),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockImplementation(async (id, data) => ({ ...baseStudent, ...data, id })),
    };
    useCase = new MarkStudentRiskUseCase(mockStudentRepository);
  });

  it('marca en riesgo con motivo y fecha', async () => {
    const result = await useCase.execute('student-1', { isAtRisk: true, reason: '  Bajo rendimiento  ' });

    expect(result.isAtRisk).toBe(true);
    expect(result.riskReason).toBe('Bajo rendimiento');
    const updateArg = mockStudentRepository.update.mock.calls[0][1];
    expect(updateArg.isAtRisk).toBe(true);
    expect(updateArg.riskReason).toBe('Bajo rendimiento');
    expect(updateArg.riskMarkedAt).toBeInstanceOf(Date);
  });

  it('exige motivo al marcar en riesgo', async () => {
    await expect(useCase.execute('student-1', { isAtRisk: true, reason: '   ' })).rejects.toThrow(
      RiskReasonRequiredError,
    );
    expect(mockStudentRepository.update).not.toHaveBeenCalled();
  });

  it('quita la marca de riesgo limpiando motivo y fecha', async () => {
    await useCase.execute('student-1', { isAtRisk: false });

    const updateArg = mockStudentRepository.update.mock.calls[0][1];
    expect(updateArg).toEqual({ isAtRisk: false, riskReason: null, riskMarkedAt: null });
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    mockStudentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { isAtRisk: true, reason: 'x' })).rejects.toThrow(
      StudentNotFoundError,
    );
  });
});
