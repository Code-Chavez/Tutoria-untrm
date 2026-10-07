import { SessionWithParticipants } from '@domain/entities/Session';
import { SessionFilters, SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/**
 * Sesiones visibles para el solicitante: la DBU ve todas; el tutor, solo las
 * suyas (aunque el cliente pida otro tutor o un estudiante ajeno); el
 * coordinador, las que incluyen a tutorados de sus escuelas; el tutorado, las
 * propias, sin los identificadores de sus compañeros en sesiones grupales.
 */
export class ListSessionsUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly guard: StudentAccessGuard,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(requesterId: string, filters: SessionFilters = {}): Promise<SessionWithParticipants[]> {
    const scope = await this.guard.scopeFor(requesterId);

    if (scope.kind === 'ALL') return this.sessions.findAll(filters);
    if (scope.kind === 'TUTOR') {
      return this.sessions.findAll({ ...filters, tutorId: scope.tutorId });
    }
    if (scope.kind === 'SCHOOLS') {
      const all = await this.sessions.findAll(filters);
      const visible: SessionWithParticipants[] = [];
      for (const session of all) {
        if (await this.guard.canSeeSession(requesterId, session)) visible.push(session);
      }
      return visible;
    }
    return this.ownSessions(requesterId, filters);
  }

  // Un tutorado ve su propia agenda y nada más.
  private async ownSessions(requesterId: string, filters: SessionFilters): Promise<SessionWithParticipants[]> {
    const user = await this.users.findById(requesterId);
    const role = user && user.isActive !== false ? await this.roles.findById(user.roleId) : null;
    if (role?.name !== 'Tutorado') return [];

    const own = await this.students.findByUserId(requesterId);
    if (!own || (filters.studentId && filters.studentId !== own.id)) return [];
    const sessions = await this.sessions.findAll({ ...filters, studentId: own.id });
    return sessions.map((s) => ({ ...s, studentIds: [own.id] }));
  }
}
