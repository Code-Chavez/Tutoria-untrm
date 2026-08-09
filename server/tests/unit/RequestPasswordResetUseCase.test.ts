import { RequestPasswordResetUseCase } from '@application/use-cases/auth/RequestPasswordResetUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { User } from '@domain/entities/User';
import { PasswordResetToken } from '@domain/entities/PasswordResetToken';

describe('RequestPasswordResetUseCase', () => {
  let useCase: RequestPasswordResetUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTokenRepository: jest.Mocked<PasswordResetTokenRepository>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@untrm.edu.pe',
    passwordHash: 'hashed_password',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roleId: 'role-123',
    createdAt: new Date(),
    updatedAt: new Date(),
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

    useCase = new RequestPasswordResetUseCase(mockUserRepository, mockTokenRepository);
  });

  it('debe crear un token si el correo existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);

    await useCase.execute('test@untrm.edu.pe');

    expect(mockTokenRepository.create).toHaveBeenCalledTimes(1);
    const createArgs = mockTokenRepository.create.mock.calls[0][0];
    expect(createArgs.userId).toBe(mockUser.id);
    expect(createArgs.used).toBe(false);
    expect(createArgs.token).toBeDefined();
    expect(createArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('no debe crear un token si el usuario no existe o esta inactivo, sin lanzar error', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('notfound@untrm.edu.pe')).resolves.not.toThrow();

    expect(mockTokenRepository.create).not.toHaveBeenCalled();
  });
});
