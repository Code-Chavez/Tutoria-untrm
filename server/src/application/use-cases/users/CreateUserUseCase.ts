import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { PasswordHasher } from '@application/ports/PasswordHasher';

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado en el sistema.`);
    this.name = 'DuplicateEmailError';
  }
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'> & { password?: string, isActive?: boolean }): Promise<Omit<User, 'passwordHash'>> {
    // 1. Validar que el correo no esté duplicado
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new DuplicateEmailError(data.email);
    }

    // 2. Generar hash de contraseña (usar por defecto si no se provee)
    const rawPassword = data.password || 'Tutor2026!'; // Contraseña por defecto
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    // 3. Crear el usuario
    const userToCreate = {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      photoUrl: data.photoUrl,
      isActive: data.isActive ?? true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      roleId: data.roleId,
    };

    const createdUser = await this.userRepository.create(userToCreate);

    // 4. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }
}
