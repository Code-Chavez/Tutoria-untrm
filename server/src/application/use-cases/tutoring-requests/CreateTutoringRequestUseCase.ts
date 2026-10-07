import { TutoringRequest } from '@domain/entities/TutoringRequest';
import { TutoringRequestRepository } from '@domain/repositories/TutoringRequestRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { CreateTutoringRequestInput } from '@application/dtos/tutoringRequest.dto';
import { InstructorDetailsRequiredError, NoRoutingTargetError } from './TutoringRequestErrors';

const DBU_ROLE_NAME = 'Administrador DBU';

/**
 * Registra una solicitud de tutoría (HU-17, Art. 19.b/19.c) y la enruta
 * automáticamente: al tutor del estudiante si tiene uno asignado, o al
 * coordinador de su escuela en caso contrario. Si la escuela no tiene
 * coordinador asignado, se usa un Administrador DBU activo como respaldo,
 * para no bloquear el registro de la solicitud.
 */
export class CreateTutoringRequestUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly guard: StudentAccessGuard,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(
    studentId: string,
    requestedById: string,
    input: CreateTutoringRequestInput,
  ): Promise<TutoringRequest> {
    // El tutor registra solicitudes de sus tutorados; el coordinador, de los de sus escuelas.
    const student = await this.guard.assertAccess(requestedById, studentId);

    if (input.source === 'INSTRUCTOR' && (!input.instructorName?.trim() || !input.courseName?.trim())) {
      throw new InstructorDetailsRequiredError();
    }

    const { routedToId, routedToRole } = await this.resolveRouting(student.tutorId, student.schoolId);

    return this.requests.create({
      studentId,
      requestedById,
      source: input.source,
      instructorName: input.source === 'INSTRUCTOR' ? input.instructorName!.trim() : null,
      courseName: input.source === 'INSTRUCTOR' ? input.courseName!.trim() : null,
      caseType: input.caseType,
      reason: input.reason.trim(),
      routedToId,
      routedToRole,
    });
  }

  private async resolveRouting(
    tutorId: string | null | undefined,
    schoolId: string,
  ): Promise<{ routedToId: string; routedToRole: 'tutor' | 'coordinator' }> {
    if (tutorId) {
      return { routedToId: tutorId, routedToRole: 'tutor' };
    }

    const school = await this.schools.findById(schoolId);
    if (school?.coordinatorId) {
      return { routedToId: school.coordinatorId, routedToRole: 'coordinator' };
    }

    // Respaldo: la escuela no tiene coordinador asignado todavía.
    const dbuRole = await this.roles.findByName(DBU_ROLE_NAME);
    const fallback = dbuRole
      ? (await this.users.findAll({ isActive: true, roleId: dbuRole.id }))[0]
      : undefined;
    if (!fallback) {
      throw new NoRoutingTargetError();
    }

    return { routedToId: fallback.id, routedToRole: 'coordinator' };
  }
}
