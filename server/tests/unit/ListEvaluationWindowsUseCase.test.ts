import { ListEvaluationWindowsUseCase } from '@application/use-cases/evaluation/ListEvaluationWindowsUseCase';
import {
  EvaluationWindowForbiddenError,
  NoActivePeriodError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { School } from '@domain/entities/School';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { EvaluationWindow } from '@domain/entities/EvaluationWindow';

describe('ListEvaluationWindowsUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let windows: jest.Mocked<EvaluationWindowRepository>;
  let useCase: ListEvaluationWindowsUseCase;

  const adminUser = { id: 'admin-1', roleId: 'role-admin' } as User;
  const activePeriod = { id: 'period-1', name: '2026-II' } as AcademicPeriod;
  const schoolA = { id: 'school-a', name: 'Ingeniería de Sistemas' } as School;
  const schoolB = { id: 'school-b', name: 'Administración' } as School;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(adminUser),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn().mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    schools = {
      findAll: jest.fn().mockResolvedValue([schoolA, schoolB]),
      findById: jest.fn(),
    };
    periods = {
      findActive: jest.fn().mockResolvedValue(activePeriod),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    windows = {
      findByPeriodAndSchool: jest.fn(),
      findAllByPeriod: jest
        .fn()
        .mockResolvedValue([{ id: 'w1', periodId: 'period-1', schoolId: 'school-a', isOpen: true } as EvaluationWindow]),
      upsert: jest.fn(),
    };
    useCase = new ListEvaluationWindowsUseCase(users, roles, schools, periods, windows);
  });

  it('reporta abierta la escuela con ventana isOpen=true y cerrada la que no tiene fila', async () => {
    const overview = await useCase.execute('admin-1');

    expect(overview.periodName).toBe('2026-II');
    expect(overview.schools).toEqual([
      { schoolId: 'school-a', schoolName: 'Ingeniería de Sistemas', isOpen: true },
      { schoolId: 'school-b', schoolName: 'Administración', isOpen: false },
    ]);
  });

  it('lanza EvaluationWindowForbiddenError para un rol que no sea Administrador DBU', async () => {
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);
    await expect(useCase.execute('admin-1')).rejects.toThrow(EvaluationWindowForbiddenError);
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('admin-1')).rejects.toThrow(NoActivePeriodError);
  });
});
