import { CreateUserUseCase, DuplicateEmailError } from '@application/use-cases/users/CreateUserUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { User } from '@domain/entities/User';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn(),
    };

    useCase = new CreateUserUseCase(mockUserRepository, mockPasswordHasher);
  });

  it('debería crear un usuario exitosamente', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      id: 'user-123',
      email: 'test@untrm.edu.pe',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed_password',
      roleId: 'role-123',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    const result = await useCase.execute({
      email: 'test@untrm.edu.pe',
      firstName: 'Test',
      lastName: 'User',
      roleId: 'role-123',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@untrm.edu.pe');
    expect(mockPasswordHasher.hash).toHaveBeenCalled();
    expect(mockUserRepository.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe('user-123');
  });

  it('debería lanzar DuplicateEmailError si el correo ya existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: 'existing-user-123',
      email: 'test@untrm.edu.pe',
    } as User);

    await expect(
      useCase.execute({
        email: 'test@untrm.edu.pe',
        firstName: 'Test',
        lastName: 'User',
        roleId: 'role-123',
      })
    ).rejects.toThrow(DuplicateEmailError);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@untrm.edu.pe');
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
