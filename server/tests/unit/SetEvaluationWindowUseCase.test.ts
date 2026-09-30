import { SetEvaluationWindowUseCase } from '@application/use-cases/evaluation/SetEvaluationWindowUseCase';
import {
  EvaluationWindowForbiddenError,
  NoActivePeriodError,
  SchoolNotFoundError,
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

describe('SetEvaluationWindowUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let windows: jest.Mocked<EvaluationWindowRepository>;
  let useCase: SetEvaluationWindowUseCase;

  const adminUser = { id: 'admin-1', roleId: 'role-admin' } as User;
  const activePeriod = { id: 'period-1', name: '2026-II' } as AcademicPeriod;
  const school = { id: 'school-a', name: 'Ingeniería de Sistemas' } as School;

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
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(school),
    };
    periods = {
      findActive: jest.fn().mockResolvedValue(activePeriod),
    };
    windows = {
      findByPeriodAndSchool: jest.fn(),
      findAllByPeriod: jest.fn(),
      upsert: jest
        .fn()
        .mockImplementation(async (periodId, schoolId, isOpen) => ({ id: 'w1', periodId, schoolId, isOpen }) as EvaluationWindow),
    };
    useCase = new SetEvaluationWindowUseCase(users, roles, schools, periods, windows);
  });

  it('abre la evaluación para una escuela en el periodo activo', async () => {
    const result = await useCase.execute('admin-1', 'school-a', true);

    expect(windows.upsert).toHaveBeenCalledWith('period-1', 'school-a', true);
    expect(result).toEqual({ schoolId: 'school-a', schoolName: 'Ingeniería de Sistemas', isOpen: true });
  });

  it('cierra la evaluación para una escuela', async () => {
    const result = await useCase.execute('admin-1', 'school-a', false);
    expect(result.isOpen).toBe(false);
  });

  it('lanza EvaluationWindowForbiddenError para un rol que no sea Administrador DBU', async () => {
    roles.findById.mockResolvedValue({ id: 'role-coord', name: 'Coordinador' } as Role);
    await expect(useCase.execute('admin-1', 'school-a', true)).rejects.toThrow(EvaluationWindowForbiddenError);
    expect(windows.upsert).not.toHaveBeenCalled();
  });

  it('lanza SchoolNotFoundError si la escuela no existe', async () => {
    schools.findById.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'school-x', true)).rejects.toThrow(SchoolNotFoundError);
    expect(windows.upsert).not.toHaveBeenCalled();
  });

  it('lanza NoActivePeriodError si no hay periodo habilitado', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'school-a', true)).rejects.toThrow(NoActivePeriodError);
    expect(windows.upsert).not.toHaveBeenCalled();
  });
});
