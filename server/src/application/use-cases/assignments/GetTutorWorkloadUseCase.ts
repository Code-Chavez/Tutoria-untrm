import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TutorWorkload } from '@application/dtos/assignment.dto';
import { TUTOR_ROLE_NAME } from './AssignStudentsUseCase';

/**
 * Carga de tutorados por tutor (HU-12): lista los Docentes Tutores activos con
 * la cantidad de estudiantes asignados, para evitar dejar tutorados sin asignar.
 */
export class GetTutorWorkloadUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(): Promise<TutorWorkload[]> {
    const tutorRole = await this.roles.findByName(TUTOR_ROLE_NAME);
    if (!tutorRole) return [];

    const tutors = await this.users.findAll({ isActive: true, roleId: tutorRole.id });
    const loads = await this.students.countByTutor();
    const countByTutor = new Map(loads.map((l) => [l.tutorId, l.count]));

    return tutors
      .map((tutor) => ({
        tutorId: tutor.id,
        fullName: `${tutor.firstName} ${tutor.lastName}`,
        email: tutor.email,
        assignedCount: countByTutor.get(tutor.id) ?? 0,
      }))
      .sort((a, b) => a.assignedCount - b.assignedCount);
  }
}
