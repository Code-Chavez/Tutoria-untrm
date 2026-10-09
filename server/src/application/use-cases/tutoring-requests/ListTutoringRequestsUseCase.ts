import { TutoringRequestView } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
} from '@domain/repositories/TutoringRequestRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { toTutoringRequestViews } from './tutoringRequestSupport';

/**
 * Bandeja de solicitudes de tutoría (R01): la DBU, todas; el resto, las enrutadas a
 * esa persona o las de tutorados dentro de su alcance (nunca las de otros).
 */
export class ListTutoringRequestsUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly guard: StudentAccessGuard,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(requesterId: string, filters?: TutoringRequestFilters): Promise<TutoringRequestView[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind === 'NONE') return [];

    const all = await this.requests.findAll(filters);
    const visibleStudents = await this.guard.visibleStudentIds(scope);
    const visible =
      visibleStudents === null ? all : all.filter((r) => r.routedToId === requesterId || visibleStudents.has(r.studentId));
    return toTutoringRequestViews(visible, this.students, this.users);
  }
}

/** Historial propio del tutorado: sus solicitudes con su estado y la respuesta recibida. */
export class ListOwnTutoringRequestsUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(userId: string): Promise<TutoringRequestView[]> {
    const student = await this.students.findByUserId(userId);
    if (!student) return [];
    return toTutoringRequestViews(await this.requests.findByStudent(student.id), this.students, this.users);
  }
}
