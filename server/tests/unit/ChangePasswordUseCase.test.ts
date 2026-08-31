import {
  ChangePasswordUseCase,
} from '@application/use-cases/profile/ChangePasswordUseCase';
import {
  IncorrectCurrentPasswordError,
  SamePasswordError,
  ProfileUserNotFoundError,
} from '@application/use-cases/profile/ProfileErrors';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'tutor@untrm.edu.pe',
    passwordHash: 'hash-of-current',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: null,
    photoUrl: null,
    roleId: 'role-1',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMocks() {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockImplementation((id, data) => Promise.resolve(buildUser({ id, ...data }))),
  };
  const refreshTokens: jest.Mocked<RefreshTokenRepository> = {
    create: jest.fn(),
    findByToken: jest.fn(),
    deleteByToken: jest.fn(),
    deleteAllForUser: jest.fn(),
  };
  const auditLogs: jest.Mocked<AuditLogRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue('hash-of-new'),
    compare: jest.fn(),
  };

  const useCase = new ChangePasswordUseCase(users, refreshTokens, auditLogs, hasher);
  return { useCase, users, refreshTokens, auditLogs, hasher };
}

describe('ChangePasswordUseCase', () => {
  const input = {
    userId: 'user-1',
    currentPassword: 'ClaveActual1',
    newPassword: 'ClaveNueva123',
  };

  it('cambia la contraseña, cierra otras sesiones y registra auditoría', async () => {
    const { useCase, users, refreshTokens, auditLogs, hasher } = buildMocks();
    users.findById.mockResolvedValue(buildUser());
    // current password matches, new password is different
    hasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await useCase.execute(input);

    expect(hasher.hash).toHaveBeenCalledWith('ClaveNueva123');
    expect(users.update).toHaveBeenCalledWith('user-1', { passwordHash: 'hash-of-new' });
    expect(refreshTokens.deleteAllForUser).toHaveBeenCalledWith('user-1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CHANGE_PASSWORD', entityId: 'user-1' }),
    );
  });

  it('rechaza si la contraseña actual es incorrecta y no toca nada', async () => {
    const { useCase, users, refreshTokens, hasher } = buildMocks();
    users.findById.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toThrow(IncorrectCurrentPasswordError);

    expect(users.update).not.toHaveBeenCalled();
    expect(refreshTokens.deleteAllForUser).not.toHaveBeenCalled();
  });

  it('rechaza si la nueva contraseña es igual a la actual', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findById.mockResolvedValue(buildUser());
    // current matches AND new also matches the stored hash
    hasher.compare.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toThrow(SamePasswordError);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('lanza ProfileUserNotFoundError si el usuario no existe', async () => {
    const { useCase, users } = buildMocks();
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(ProfileUserNotFoundError);
  });
});
