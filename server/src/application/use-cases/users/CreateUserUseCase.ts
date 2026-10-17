import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { resolveService } from './serviceAssignment';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { resolveTutorSchool, TutorSchoolRequiredError } from './tutorSchool';
import { DeanFacultyRequiredError, resolveDeanFaculty } from './deanFaculty';
import { DuplicateEmailError } from './UserErrors';
import { normalizeEmail } from './normalizeEmail';
import { randomBytes } from 'node:crypto';

export { DuplicateEmailError, TutorSchoolRequiredError, DeanFacultyRequiredError };

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties?: FacultyRepository,
  ) {}

  async execute(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil' | 'mustChangePassword'> & { password?: string, isActive?: boolean }): Promise<Omit<User, 'passwordHash'>> {
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
    const schoolId = await resolveTutorSchool(this.schools, role.name, data.schoolId);
    const facultyId = await resolveDeanFaculty(this.faculties, role.name, data.facultyId);

    // 3. Sin clave indicada, la cuenta nace **sin clave utilizable** (una al azar que nadie conoce) y pendiente de activación:
    //    la persona crea la suya con la invitación de un solo uso (IssueInvitationUseCase). Ninguna clave se muestra ni se envía.
    const pendingActivation = !data.password;
    const passwordHash = await this.passwordHasher.hash(data.password ?? randomBytes(32).toString('hex'));

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
      mustChangePassword: pendingActivation,
      roleId: data.roleId,
      service,
      schoolId,
      facultyId,
    };

    const createdUser = await this.userRepository.create(userToCreate);

    // 5. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }
}
