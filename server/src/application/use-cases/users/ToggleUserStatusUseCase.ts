import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el usuario con ID ${id}`);
    this.name = 'UserNotFoundError';
  }
}

export class ToggleUserStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<Omit<User, 'passwordHash'>> {
    // 1. Validar que el usuario exista
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new UserNotFoundError(id);
    }

    // 2. Cambiar el estado (Baja Lógica)
    const newStatus = !existingUser.isActive;
    const updatedUser = await this.userRepository.update(id, { isActive: newStatus });

    // 3. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
