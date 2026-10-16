import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { User } from '@domain/entities/User';
import { TutorNotFoundError, TutorSchoolMismatchError } from './AssignmentErrors';

export const TUTOR_ROLE_NAME = 'Docente Tutor';

/** Valida que el usuario exista, esté activo y tenga el rol Docente Tutor. */
export async function assertActiveTutor(
  users: UserRepository,
  roles: RoleRepository,
  tutorId: string,
): Promise<User> {
  const tutorRole = await roles.findByName(TUTOR_ROLE_NAME);
  const tutor = await users.findById(tutorId);
  if (!tutor || !tutor.isActive || !tutorRole || tutor.roleId !== tutorRole.id) {
    throw new TutorNotFoundError();
  }
  return tutor;
}

/**
 * El tutor solo atiende estudiantes de su escuela. Un tutor sin escuela registrada (cuenta anterior a esta regla)
 * no se bloquea, pero la pantalla de usuarios lo marca para que se le indique la suya.
 */
export function assertTutorServesSchools(tutor: User, schoolIds: Iterable<string>): void {
  if (!tutor.schoolId) return;
  for (const schoolId of schoolIds) {
    if (schoolId !== tutor.schoolId) throw new TutorSchoolMismatchError();
  }
}
