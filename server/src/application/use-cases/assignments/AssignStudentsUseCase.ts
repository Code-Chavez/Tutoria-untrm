import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AssignStudentsInput, AssignStudentsResult } from '@application/dtos/assignment.dto';
import { TutorNotFoundError, NoStudentsSelectedError } from './AssignmentErrors';

export const TUTOR_ROLE_NAME = 'Docente Tutor';

/**
 * Asignación masiva de tutorados a un Docente Tutor (HU-12). Valida que el tutor
 * exista, esté activo y tenga el rol correcto, y registra la fecha de asignación.
 */
export class AssignStudentsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(input: AssignStudentsInput): Promise<AssignStudentsResult> {
    const studentIds = [...new Set(input.studentIds ?? [])].filter(Boolean);
    if (studentIds.length === 0) {
      throw new NoStudentsSelectedError();
    }

    const tutorRole = await this.roles.findByName(TUTOR_ROLE_NAME);
    const tutor = await this.users.findById(input.tutorId);
    if (!tutor || !tutor.isActive || !tutorRole || tutor.roleId !== tutorRole.id) {
      throw new TutorNotFoundError();
    }

    const assigned = await this.students.assignTutor(studentIds, tutor.id, new Date());
    return { assigned };
  }
}
