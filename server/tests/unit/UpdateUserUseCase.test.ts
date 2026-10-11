import { UpdateUserUseCase, UserNotFoundError } from '@application/use-cases/users/UpdateUserUseCase';
import { ServiceRequiredError } from '@application/use-cases/users/serviceAssignment';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Role } from '@domain/entities/Role';
import { User } from '@domain/entities/User';

const role = (id: string, name: string) => ({ id, name, description: '', permissions: [], createdAt: new Date() }) as Role;
const user = (overrides: Partial<User> = {}) =>
  ({
    id: 'u1',
    email: 'persona@untrm.edu.pe',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Ruiz',
    roleId: 'tutor',
    service: null,
    isActive: true,
    ...overrides,
  }) as User;

describe('UpdateUserUseCase', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let useCase: UpdateUserUseCase;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(user()),
      findByEmail: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockImplementation(async (_id, data) => user(data)),
    };
    roles = {
      findById: jest.fn().mockImplementation(async (id: string) => (id === 'servicio' ? role('servicio', 'Profesional de Servicio') : role(id, 'Docente Tutor'))),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    useCase = new UpdateUserUseCase(users, roles);
  });

  it('lanza error si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);
    await expect(useCase.execute('x', { firstName: 'Z' })).rejects.toThrow(UserNotFoundError);
  });

  it('un cambio de datos que no toca el rol ni el servicio no consulta los roles', async () => {
    await useCase.execute('u1', { phone: '999' });
    expect(roles.findById).not.toHaveBeenCalled();
    expect(users.update).toHaveBeenCalledWith('u1', { phone: '999' });
  });

  it('pasar a Profesional de Servicio sin servicio se rechaza', async () => {
    await expect(useCase.execute('u1', { roleId: 'servicio' })).rejects.toThrow(ServiceRequiredError);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('pasar a Profesional de Servicio con servicio lo guarda', async () => {
    await useCase.execute('u1', { roleId: 'servicio', service: 'PSICOLOGIA' });
    expect(users.update).toHaveBeenCalledWith('u1', { roleId: 'servicio', service: 'PSICOLOGIA' });
  });

  it('cambiar solo el servicio de un profesional ya existente funciona', async () => {
    users.findById.mockResolvedValue(user({ roleId: 'servicio', service: 'SALUD' }));
    await useCase.execute('u1', { service: 'PSICOLOGIA' });
    expect(users.update).toHaveBeenCalledWith('u1', { service: 'PSICOLOGIA' });
  });

  it('dejar el rol de servicio descarta el servicio', async () => {
    users.findById.mockResolvedValue(user({ roleId: 'servicio', service: 'SALUD' }));
    await useCase.execute('u1', { roleId: 'tutor' });
    expect(users.update).toHaveBeenCalledWith('u1', { roleId: 'tutor', service: null });
  });
});
