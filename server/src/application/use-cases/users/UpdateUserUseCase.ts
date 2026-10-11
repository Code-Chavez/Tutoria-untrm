import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { resolveService } from './serviceAssignment';

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el usuario con ID ${id}`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado por otro usuario.`);
    this.name = 'DuplicateEmailError';
  }
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>>): Promise<Omit<User, 'passwordHash'>> {
    // 1. Validar que el usuario exista
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new UserNotFoundError(id);
    }

    // 2. Si se está actualizando el correo, validar que no esté en uso por OTRO usuario
    if (data.email && data.email !== existingUser.email) {
      const emailUser = await this.userRepository.findByEmail(data.email);
      if (emailUser) {
        throw new DuplicateEmailError(data.email);
      }
    }

    // 3. Si cambia el rol o el servicio, el par queda coherente (servicio solo para Profesional de Servicio)
    const changes = { ...data };
    if (data.roleId !== undefined || data.service !== undefined) {
      const roleId = data.roleId ?? existingUser.roleId;
      const role = await this.roles.findById(roleId);
      if (!role) throw new RoleNotFoundError(roleId);
      changes.service = resolveService(role.name, data.service !== undefined ? data.service : existingUser.service);
    }

    // 4. Actualizar el usuario
    const updatedUser = await this.userRepository.update(id, changes);

    // 5. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
