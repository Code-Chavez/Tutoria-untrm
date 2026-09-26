import { GetReferralConstanciaUseCase } from '@application/use-cases/referrals/GetReferralConstanciaUseCase';
import { ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { School } from '@domain/entities/School';

describe('GetReferralConstanciaUseCase', () => {
  let useCase: GetReferralConstanciaUseCase;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let schools: jest.Mocked<SchoolRepository>;

  const referral: StudentReferral = {
    id: 'referral-1',
    studentId: 'student-1',
    referredById: 'tutor-1',
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING', 'MENTAL_HEALTH_ANXIOUS'],
    reason: 'Bajo rendimiento y señales de ansiedad',
    service: 'PSICOLOGIA',
    receivingInstance: 'Psicóloga Ana García',
    status: 'ENVIADO',
    createdAt: new Date('2026-09-25T10:00:00Z'),
  };

  const student = {
    id: 'student-1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    cycle: 5,
    schoolId: 'school-1',
  } as Student;

  const tutor = { id: 'tutor-1', firstName: 'Elena', lastName: 'Ramírez' } as User;
  const school = { id: 'school-1', name: 'Ingeniería de Sistemas' } as School;

  beforeEach(() => {
    referrals = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(referral),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
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
    users = {
      findById: jest.fn().mockResolvedValue(tutor),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    schools = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(school),
    };
    useCase = new GetReferralConstanciaUseCase(referrals, students, users, schools);
  });

  it('resuelve nombres y etiquetas de los aspectos marcados', async () => {
    const result = await useCase.execute('referral-1');

    expect(result.studentName).toBe('Ana Torres');
    expect(result.studentCode).toBe('20191234');
    expect(result.schoolName).toBe('Ingeniería de Sistemas');
    expect(result.referredByName).toBe('Elena Ramírez');
    expect(result.service).toBe('PSICOLOGIA');
    expect(result.receivingInstance).toBe('Psicóloga Ana García');
    expect(result.aspects).toEqual([
      { category: 'Académicos', label: 'Está en riesgo de repetir algún curso' },
      {
        category: 'Salud mental',
        label: 'Se le observa o escucha nervioso/a o con elevados niveles de ansiedad',
      },
    ]);
  });

  it('lanza ReferralNotFoundError si la derivación no existe', async () => {
    referrals.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(ReferralNotFoundError);
  });
});
