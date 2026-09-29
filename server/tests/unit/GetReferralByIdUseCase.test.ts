import { GetReferralByIdUseCase } from '@application/use-cases/referrals/GetReferralByIdUseCase';
import {
  ReferralNotFoundError,
  ReferralForbiddenError,
} from '@application/use-cases/referrals/ReferralErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

describe('GetReferralByIdUseCase', () => {
  let useCase: GetReferralByIdUseCase;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;

  const referral = {
    id: 'ref-1',
    referredById: 'tutor-1',
    service: 'PSICOLOGIA',
  } as StudentReferral;

  beforeEach(() => {
    referrals = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(referral),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
    };
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    useCase = new GetReferralByIdUseCase(referrals, users, roles);
  });

  it('lanza ReferralNotFoundError si la derivación no existe', async () => {
    referrals.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(ReferralNotFoundError);
  });

  it('permite ver cualquier derivación a Administrador DBU', async () => {
    users.findById.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin' } as User);
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);

    await expect(useCase.execute('ref-1', 'admin-1')).resolves.toEqual(referral);
  });

  it('permite al tutor emisor ver su propia derivación', async () => {
    users.findById.mockResolvedValue({ id: 'tutor-1', roleId: 'role-tutor' } as User);
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);

    await expect(useCase.execute('ref-1', 'tutor-1')).resolves.toEqual(referral);
  });

  it('lanza ReferralForbiddenError si otro tutor intenta ver la derivación', async () => {
    users.findById.mockResolvedValue({ id: 'otro-tutor', roleId: 'role-tutor' } as User);
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);

    await expect(useCase.execute('ref-1', 'otro-tutor')).rejects.toThrow(ReferralForbiddenError);
  });

  it('permite al profesional del servicio correspondiente ver la derivación', async () => {
    users.findById.mockResolvedValue({
      id: 'prof-1',
      roleId: 'role-serv',
      service: 'PSICOLOGIA',
    } as User);
    roles.findById.mockResolvedValue({ id: 'role-serv', name: 'Profesional de Servicio' } as Role);

    await expect(useCase.execute('ref-1', 'prof-1')).resolves.toEqual(referral);
  });

  it('lanza ReferralForbiddenError si el profesional es de otro servicio', async () => {
    users.findById.mockResolvedValue({
      id: 'prof-2',
      roleId: 'role-serv',
      service: 'SALUD',
    } as User);
    roles.findById.mockResolvedValue({ id: 'role-serv', name: 'Profesional de Servicio' } as Role);

    await expect(useCase.execute('ref-1', 'prof-2')).rejects.toThrow(ReferralForbiddenError);
  });

  it('lanza ReferralForbiddenError para cualquier otro rol', async () => {
    users.findById.mockResolvedValue({ id: 'coord-1', roleId: 'role-coord' } as User);
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);

    await expect(useCase.execute('ref-1', 'coord-1')).rejects.toThrow(ReferralForbiddenError);
  });
});
