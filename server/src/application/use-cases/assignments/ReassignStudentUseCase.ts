import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { ReassignStudentInput } from '@application/dtos/assignment.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { ReassignReasonRequiredError, SameTutorAssignmentError } from './AssignmentErrors';
import { assertActiveTutor } from './TutorValidation';

/**
 * Reasignación individual de un tutorado (HU-13). Exige un motivo y conserva
 * el historial con el tutor anterior (Art. 24.b del Protocolo).
 *
 * Nota: la notificación a ambos tutores (anterior y nuevo) queda pendiente de
 * un módulo de notificaciones que aún no existe en el sistema; este punto
 * queda marcado para conectarla cuando ese servicio esté disponible.
 */
export class ReassignStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly history: TutorAssignmentHistoryRepository,
  ) {}

  async execute(
    studentId: string,
    actingUserId: string,
    input: ReassignStudentInput,
  ): Promise<Student> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    const reason = input.reason?.trim();
    if (!reason) {
      throw new ReassignReasonRequiredError();
    }

    const newTutor = await assertActiveTutor(this.users, this.roles, input.newTutorId);

    if (student.tutorId === newTutor.id) {
      throw new SameTutorAssignmentError();
    }

    const previousTutorId = student.tutorId ?? null;
    const assignedAt = new Date();

    const updated = await this.students.update(studentId, { tutorId: newTutor.id, assignedAt });

    await this.history.create({
      studentId,
      previousTutorId,
      newTutorId: newTutor.id,
      reason,
      reassignedById: actingUserId,
    });

    // TODO(notificaciones): notificar a previousTutorId y newTutor.id cuando
    // exista un servicio de notificaciones (correo/in-app).

    return updated;
  }
}
