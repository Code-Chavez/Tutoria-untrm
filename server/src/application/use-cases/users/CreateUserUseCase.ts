import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { resolveService } from './serviceAssignment';
import { DuplicateEmailError } from './UserErrors';
import { normalizeEmail } from './normalizeEmail';

export { DuplicateEmailError };

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly roles: RoleRepository,
  ) {}

  async execute(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'> & { password?: string, isActive?: boolean }): Promise<Omit<User, 'passwordHash'>> {
    // 1. Validar que el correo no esté duplicado (comparado ya normalizado)
    const email = normalizeEmail(data.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new DuplicateEmailError(email);
    }

    // 2. El rol manda: un Profesional de Servicio necesita su servicio; los demás roles no tienen
    const role = await this.roles.findById(data.roleId);
    if (!role) throw new RoleNotFoundError(data.roleId);
    const service = resolveService(role.name, data.service);

    // 3. Generar hash de contraseña (usar por defecto si no se provee)
    const rawPassword = data.password || 'Tutor2026!'; // Contraseña por defecto
    const passwordHash = await this.passwordHasher.hash(rawPassword);

    // 4. Crear el usuario
    const userToCreate = {
      email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      photoUrl: data.photoUrl,
      isActive: data.isActive ?? true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      roleId: data.roleId,
      service,
    };

    const createdUser = await this.userRepository.create(userToCreate);

    // 5. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }
}
