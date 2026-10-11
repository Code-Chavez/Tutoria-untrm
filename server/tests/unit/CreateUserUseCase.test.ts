import { CreateUserUseCase, DuplicateEmailError } from '@application/use-cases/users/CreateUserUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { User } from '@domain/entities/User';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Role } from '@domain/entities/Role';
import { ServiceRequiredError } from '@application/use-cases/users/serviceAssignment';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;
  let mockRoles: jest.Mocked<RoleRepository>;
  const roleNamed = (name: string) => ({ id: 'role-123', name, description: '', permissions: [], createdAt: new Date() }) as Role;

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

    mockRoles = { findById: jest.fn().mockResolvedValue(roleNamed('Docente Tutor')), findByName: jest.fn(), findAll: jest.fn(), create: jest.fn() };
    mockUserRepository.create.mockImplementation(async (data) => ({ id: 'u1', createdAt: new Date(), updatedAt: new Date(), ...data }) as User);

    useCase = new CreateUserUseCase(mockUserRepository, mockPasswordHasher, mockRoles);
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

  describe('servicio del Profesional de Servicio', () => {
    const base = { email: 'psi@untrm.edu.pe', firstName: 'Lucía', lastName: 'Flores', roleId: 'role-123' };

    it('exige el servicio: sin él no vería ni recibiría ninguna derivación', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoles.findById.mockResolvedValue(roleNamed('Profesional de Servicio'));

      await expect(useCase.execute(base)).rejects.toThrow(ServiceRequiredError);
      await expect(useCase.execute({ ...base, service: 'OTRO' })).rejects.toThrow(ServiceRequiredError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('guarda el servicio indicado', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoles.findById.mockResolvedValue(roleNamed('Profesional de Servicio'));

      const result = await useCase.execute({ ...base, service: 'PSICOLOGIA' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ service: 'PSICOLOGIA' }));
      expect(result.service).toBe('PSICOLOGIA');
    });

    it('en cualquier otro rol descarta el servicio', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await useCase.execute({ ...base, service: 'SALUD' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ service: null }));
      expect(result.service).toBeNull();
    });
  });
});
