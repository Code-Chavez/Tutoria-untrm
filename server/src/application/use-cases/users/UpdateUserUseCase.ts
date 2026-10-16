import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { resolveService } from './serviceAssignment';
import { resolveTutorSchool, TutorSchoolRequiredError } from './tutorSchool';
import { DuplicateEmailError } from './UserErrors';
import { normalizeEmail } from './normalizeEmail';

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el usuario con ID ${id}`);
    this.name = 'UserNotFoundError';
  }
}

export { DuplicateEmailError, TutorSchoolRequiredError };

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>>): Promise<Omit<User, 'passwordHash'>> {
    // 1. Validar que el usuario exista
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new UserNotFoundError(id);
    }

    // 2. Si se está actualizando el correo, validar que no esté en uso por OTRO usuario
    const changes = { ...data };
    if (data.email) {
      const email = normalizeEmail(data.email);
      const emailUser = await this.userRepository.findByEmail(email);
      if (emailUser && emailUser.id !== id) {
        throw new DuplicateEmailError(email);
      }
      changes.email = email;
    }

    // 3. Si cambia el rol o el servicio, el par queda coherente (servicio solo para Profesional de Servicio)
    if (data.roleId !== undefined || data.service !== undefined) {
      const roleId = data.roleId ?? existingUser.roleId;
      const role = await this.roles.findById(roleId);
      if (!role) throw new RoleNotFoundError(roleId);
      changes.service = resolveService(role.name, data.service !== undefined ? data.service : existingUser.service);
    }

    // 3b. Un docente tutor pertenece a una escuela: se exige al volverlo tutor o al tocar su escuela; el resto la conserva o la pierde según el rol.
    if (data.roleId !== undefined || data.schoolId !== undefined) {
      const roleId = data.roleId ?? existingUser.roleId;
      const role = await this.roles.findById(roleId);
      if (!role) throw new RoleNotFoundError(roleId);
      const schoolId = await resolveTutorSchool(this.schools, role.name, data.schoolId !== undefined ? data.schoolId : existingUser.schoolId);
      if (schoolId !== (existingUser.schoolId ?? null)) changes.schoolId = schoolId;
      else delete changes.schoolId;
    }

    // 4. Actualizar el usuario
    const updatedUser = await this.userRepository.update(id, changes);

    // 5. Retornar el usuario sin exponer el hash de contraseña
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
