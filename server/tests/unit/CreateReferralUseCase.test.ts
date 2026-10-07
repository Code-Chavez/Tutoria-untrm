import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { CreateReferralInput } from '@application/dtos/referral.dto';
import { allowAllGuard } from '../helpers/studentGuard';

describe('CreateReferralUseCase', () => {
  let useCase: CreateReferralUseCase;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let notifications: jest.Mocked<NotificationRepository>;

  const student = { id: 'student-1', firstName: 'Ana', lastName: 'Torres' } as Student;
  const serviceRole = { id: 'role-serv', name: 'Profesional de Servicio' } as Role;
  const professional = { id: 'prof-1', service: 'PSICOPEDAGOGIA' } as User;

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
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn().mockResolvedValue([professional]),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn().mockResolvedValue(serviceRole),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    notifications = {
      create: jest.fn(),
      findByUser: jest.fn(),
      markRead: jest.fn(),
    };
    useCase = new CreateReferralUseCase(referrals, allowAllGuard(students), users, roles, notifications);
  });

  it('crea la derivación con el checklist, motivo y servicio elegidos', async () => {
    const result = await useCase.execute('student-1', 'tutor-1', input);

    expect(referrals.create).toHaveBeenCalledWith({
      studentId: 'student-1',
      referredById: 'tutor-1',
      checkedAspects: input.checkedAspects,
      reason: input.reason,
      service: input.service,
      receivingInstance: null,
    });
    expect(result.id).toBe('referral-1');
  });

  it('registra la instancia receptora cuando se indica (HU-29)', async () => {
    await useCase.execute('student-1', 'tutor-1', {
      ...input,
      receivingInstance: '  Psicólogo Juan Pérez - Consultorio 3  ',
    });

    expect(referrals.create).toHaveBeenCalledWith(
      expect.objectContaining({ receivingInstance: 'Psicólogo Juan Pérez - Consultorio 3' }),
    );
  });

  it('notifica a los profesionales del servicio destino (HU-33)', async () => {
    await useCase.execute('student-1', 'tutor-1', input);

    expect(roles.findByName).toHaveBeenCalledWith('Profesional de Servicio');
    expect(users.findAll).toHaveBeenCalledWith({
      roleId: serviceRole.id,
      service: input.service,
      isActive: true,
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: professional.id,
        type: 'REFERRAL_CREATED',
        referralId: 'referral-1',
      }),
    );
  });

  it('no falla si el rol Profesional de Servicio no existe', async () => {
    roles.findByName.mockResolvedValue(null);

    await expect(useCase.execute('student-1', 'tutor-1', input)).resolves.toBeDefined();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('lanza StudentNotFoundError si el tutorado no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1', input)).rejects.toThrow(
      StudentNotFoundError,
    );
    expect(referrals.create).not.toHaveBeenCalled();
  });
});
