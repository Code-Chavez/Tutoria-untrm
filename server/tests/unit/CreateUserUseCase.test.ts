import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { TutorSchoolRequiredError } from '@application/use-cases/users/tutorSchool';
import { CreateUserUseCase, DuplicateEmailError } from '@application/use-cases/users/CreateUserUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { User } from '@domain/entities/User';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Role } from '@domain/entities/Role';
import { ServiceRequiredError } from '@application/use-cases/users/serviceAssignment';

describe('CreateUserUseCase', () => {
  let schools: jest.Mocked<SchoolRepository>;
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

    mockRoles = { findById: jest.fn().mockResolvedValue(roleNamed('Coordinador')), findByName: jest.fn(), findAll: jest.fn(), create: jest.fn() };
    schools = { findById: jest.fn().mockImplementation(async (id: string) => ({ id, name: 'Sistemas', facultyId: 'f1', isActive: true, createdAt: new Date() })), findAll: jest.fn() };
    mockUserRepository.create.mockImplementation(async (data) => ({ id: 'u1', createdAt: new Date(), updatedAt: new Date(), ...data }) as User);

    useCase = new CreateUserUseCase(mockUserRepository, mockPasswordHasher, mockRoles, schools);
  });

  it('normaliza el correo (espacios y mayúsculas) antes de buscar duplicados y de guardar', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: '  Persona@UNTRM.edu.pe ', firstName: 'Ana', lastName: 'Ruiz', roleId: 'role-123' });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('persona@untrm.edu.pe');
    expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'persona@untrm.edu.pe' }));
  });

  describe('escuela del docente tutor (fase 3)', () => {
    const input = { email: 'tutor@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'role-123' };

    it('un docente tutor guarda su escuela', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoles.findById.mockResolvedValue(roleNamed('Docente Tutor'));

      await useCase.execute({ ...input, schoolId: 'school-1' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 'school-1' }));
    });

    it('un docente tutor sin escuela, o con una escuela que no existe o está inactiva, se rechaza', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoles.findById.mockResolvedValue(roleNamed('Docente Tutor'));

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(TutorSchoolRequiredError);
      schools.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute({ ...input, schoolId: 'nada' })).rejects.toBeInstanceOf(TutorSchoolRequiredError);
      schools.findById.mockResolvedValueOnce({ id: 'school-1', isActive: false } as never);
      await expect(useCase.execute({ ...input, schoolId: 'school-1' })).rejects.toBeInstanceOf(TutorSchoolRequiredError);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('los demás roles no guardan escuela aunque se envíe', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoles.findById.mockResolvedValue(roleNamed('Coordinador'));

      await useCase.execute({ ...input, schoolId: 'school-1' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ schoolId: null }));
    });
  });

  describe('cuenta nueva: sin clave conocida, pendiente de activación (A01)', () => {
    const input = { email: 'nueva@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'role-123' };

    it('sin clave indicada nace con una clave al azar que nadie conoce y pendiente de activación', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await useCase.execute(input);

      const secret = mockPasswordHasher.hash.mock.calls[0][0] as string;
      expect(secret).toMatch(/^[0-9a-f]{64}$/);
      expect(secret).not.toBe('Tutor2026!');
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
      expect(JSON.stringify(result)).not.toContain(secret); // la clave al azar no sale en ninguna respuesta
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('temporaryPassword');
    });

    it('dos cuentas nuevas no comparten clave', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await useCase.execute(input);
      await useCase.execute({ ...input, email: 'otra@untrm.edu.pe' });

      expect(mockPasswordHasher.hash.mock.calls[0][0]).not.toBe(mockPasswordHasher.hash.mock.calls[1][0]);
    });

    it('con una clave indicada (carga interna) la usa tal cual y no exige cambiarla', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await useCase.execute({ ...input, password: 'ClaveElegida1!' });

      expect(result).not.toHaveProperty('temporaryPassword');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('ClaveElegida1!');
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: false }));
    });
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
