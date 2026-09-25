import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { Student } from '@domain/entities/Student';
import { CreateReferralInput } from '@application/dtos/referral.dto';

describe('CreateReferralUseCase', () => {
  let useCase: CreateReferralUseCase;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let students: jest.Mocked<StudentRepository>;

  const student = { id: 'student-1', firstName: 'Ana', lastName: 'Torres' } as Student;

  const input: CreateReferralInput = {
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING', 'SOCIAL_IMPULSIVE'],
    reason: 'Bajo rendimiento sostenido y conflictos con compañeros',
    service: 'PSICOPEDAGOGIA',
  };

  beforeEach(() => {
    referrals = {
      create: jest.fn().mockImplementation(async (data) => ({
        id: 'referral-1',
        createdAt: new Date(),
        ...data,
      })),
      findById: jest.fn(),
    };
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
    useCase = new CreateReferralUseCase(referrals, students);
  });

  it('crea la derivación con el checklist, motivo y servicio elegidos', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', input);

    expect(referrals.create).toHaveBeenCalledWith({
      studentId: 'student-1',
      referredById: 'tutor-1',
      checkedAspects: input.checkedAspects,
      reason: input.reason,
      service: input.service,
    });
    expect(result.id).toBe('referral-1');
  });

  it('lanza StudentNotFoundError si el tutorado no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', input)).rejects.toThrow(
      StudentNotFoundError,
    );
    expect(referrals.create).not.toHaveBeenCalled();
  });
});
