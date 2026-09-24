import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import {
  StudentNotFoundError,
  PortalUserNotFoundError,
  PortalUserRoleMismatchError,
  PortalUserAlreadyLinkedError,
} from './StudentErrors';

const STUDENT_ROLE_NAME = 'Tutorado';

/**
 * Vincula (o desvincula, con userId=null) la cuenta de portal de un tutorado
 * a su registro de estudiante, habilitando el autoservicio (p. ej. solicitar
 * tutoría desde su propia cuenta en vez de que el personal la registre por él).
 */
export class LinkStudentPortalAccountUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(studentId: string, userId: string | null): Promise<Student> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    if (userId === null) {
      return this.students.update(studentId, { userId: null });
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new PortalUserNotFoundError(userId);
    }

    const role = await this.roles.findById(user.roleId);
    if (role?.name !== STUDENT_ROLE_NAME) {
      throw new PortalUserRoleMismatchError();
    }

    const alreadyLinked = await this.students.findByUserId(userId);
    if (alreadyLinked && alreadyLinked.id !== studentId) {
      throw new PortalUserAlreadyLinkedError();
    }

    return this.students.update(studentId, { userId });
  }
}
