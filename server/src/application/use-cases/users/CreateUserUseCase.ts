import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { resolveService } from './serviceAssignment';
import { DuplicateEmailError } from './UserErrors';
import { normalizeEmail } from './normalizeEmail';
import { generateTemporaryPassword } from './temporaryPassword';

export { DuplicateEmailError };

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly roles: RoleRepository,
  ) {}

  async execute(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil' | 'mustChangePassword'> & { password?: string, isActive?: boolean }): Promise<Omit<User, 'passwordHash'> & { temporaryPassword?: string }> {
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

    // 3. Sin clave indicada, la cuenta nace con una clave temporal aleatoria que debe cambiarse al primer ingreso.
    const temporaryPassword = data.password ? undefined : generateTemporaryPassword();
    const rawPassword = data.password ?? temporaryPassword!;
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
      mustChangePassword: temporaryPassword !== undefined,
      roleId: data.roleId,
      service,
    };

    const createdUser = await this.userRepository.create(userToCreate);

    // 5. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = createdUser;
    // La clave temporal se devuelve una sola vez, a quien crea la cuenta: no se guarda en claro en ningún lado.
    return temporaryPassword ? { ...userWithoutPassword, temporaryPassword } : userWithoutPassword;
  }
}
