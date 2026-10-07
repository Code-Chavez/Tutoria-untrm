import { TutoringRequest } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
} from '@domain/repositories/TutoringRequestRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/**
 * Solicitudes de tutoría visibles: la DBU, todas; el resto, las enrutadas a
 * esa persona o las de tutorados dentro de su alcance (nunca las de otros).
 */
export class ListTutoringRequestsUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(requesterId: string, filters?: TutoringRequestFilters): Promise<TutoringRequest[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind === 'NONE') return [];

    const all = await this.requests.findAll(filters);
    const visibleStudents = await this.guard.visibleStudentIds(scope);
    if (visibleStudents === null) return all;
    return all.filter((r) => r.routedToId === requesterId || visibleStudents.has(r.studentId));
  }
}
