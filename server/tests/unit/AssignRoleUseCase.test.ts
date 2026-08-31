import { AssignRoleUseCase } from '@application/use-cases/roles/AssignRoleUseCase';
import {
  RoleNotFoundError,
  RoleTargetUserNotFoundError,
} from '@application/use-cases/roles/RoleErrors';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'tutor@untrm.edu.pe',
    passwordHash: 'secret-hash',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: null,
    photoUrl: null,
    roleId: 'role-old',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const targetRole: Role = {
  id: 'role-new',
  name: 'Coordinador',
  description: '',
  permissions: [],
  createdAt: new Date(),
};

function buildMocks() {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockImplementation((id, data) => Promise.resolve(buildUser({ id, ...data }))),
  };
  const roles: jest.Mocked<RoleRepository> = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
  const auditLogs: jest.Mocked<AuditLogRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const useCase = new AssignRoleUseCase(users, roles, auditLogs);
  return { useCase, users, roles, auditLogs };
}

describe('AssignRoleUseCase', () => {
  it('asigna el rol, audita y no expone el hash de contraseña', async () => {
    const { useCase, users, roles, auditLogs } = buildMocks();
    users.findById.mockResolvedValue(buildUser());
    roles.findById.mockResolvedValue(targetRole);

    const result = await useCase.execute('user-1', 'role-new');

    expect(users.update).toHaveBeenCalledWith('user-1', { roleId: 'role-new' });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ASSIGN_ROLE', entityId: 'user-1' }),
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.roleId).toBe('role-new');
  });

  it('lanza error si el usuario no existe', async () => {
    const { useCase, users } = buildMocks();
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('nope', 'role-new')).rejects.toThrow(RoleTargetUserNotFoundError);
  });

  it('lanza error si el rol no existe', async () => {
    const { useCase, users, roles } = buildMocks();
    users.findById.mockResolvedValue(buildUser());
    roles.findById.mockResolvedValue(null);

    await expect(useCase.execute('user-1', 'ghost-role')).rejects.toThrow(RoleNotFoundError);
    expect(users.update).not.toHaveBeenCalled();
  });
});
