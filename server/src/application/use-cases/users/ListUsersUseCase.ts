import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(filters?: { isActive?: boolean; roleId?: string }): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.userRepository.findAll(filters);
    
    // Retornar los usuarios sin exponer el hash de contraseña
    return users.map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }
}
