import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AssignStudentsInput, AssignStudentsResult } from '@application/dtos/assignment.dto';
import { NoStudentsSelectedError } from './AssignmentErrors';
import { assertActiveTutor } from './TutorValidation';

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

    const tutor = await assertActiveTutor(this.users, this.roles, input.tutorId);

    const assigned = await this.students.assignTutor(studentIds, tutor.id, new Date());
    return { assigned };
  }
}
