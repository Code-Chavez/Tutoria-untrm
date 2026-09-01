import { ResetPasswordUseCase, InvalidTokenError } from '@application/use-cases/auth/ResetPasswordUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { PasswordResetToken } from '@domain/entities/PasswordResetToken';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let mockHasher: jest.Mocked<PasswordHasher>;

  const mockTokenRecord: PasswordResetToken = {
    id: 'token-123',
    token: 'valid-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 10000), // Expira en el futuro
    used: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockTokenRepository = {
      create: jest.fn(),
      findByToken: jest.fn(),
      markAsUsed: jest.fn(),
    };

    mockHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new ResetPasswordUseCase(mockUserRepository, mockTokenRepository, mockHasher);
  });

  it('debe restablecer la contraseña si el token es valido', async () => {
    mockTokenRepository.findByToken.mockResolvedValue(mockTokenRecord);
    mockHasher.hash.mockResolvedValue('new_hashed_password');

    await useCase.execute({
      token: 'valid-token',
      newPassword: 'newpassword123',
    });

    expect(mockHasher.hash).toHaveBeenCalledWith('newpassword123');
    expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', {
      passwordHash: 'new_hashed_password',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith('token-123');
  });

  it('debe lanzar error si el token es invalido o no existe', async () => {
    mockTokenRepository.findByToken.mockResolvedValue(null);

    await expect(
      useCase.execute({ token: 'invalid', newPassword: '123' })
    ).rejects.toThrow(InvalidTokenError);
  });

  it('debe lanzar error si el token ya fue usado', async () => {
    mockTokenRepository.findByToken.mockResolvedValue({
      ...mockTokenRecord,
      used: true,
    });

    await expect(
      useCase.execute({ token: 'used-token', newPassword: '123' })
    ).rejects.toThrow(InvalidTokenError);
  });

  it('debe lanzar error si el token ha expirado', async () => {
    mockTokenRepository.findByToken.mockResolvedValue({
      ...mockTokenRecord,
      expiresAt: new Date(Date.now() - 10000), // Expira en el pasado
    });

    await expect(
      useCase.execute({ token: 'expired-token', newPassword: '123' })
    ).rejects.toThrow(InvalidTokenError);
  });
});
