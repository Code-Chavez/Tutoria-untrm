import { TutoringRequestView } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
} from '@domain/repositories/TutoringRequestRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
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
    private readonly sessions?: SessionRepository,
  ) {}

  async execute(requesterId: string, filters?: TutoringRequestFilters): Promise<TutoringRequestView[]> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind === 'NONE') return [];

    const all = await this.requests.findAll(filters);
    const visibleStudents = await this.guard.visibleStudentIds(scope);
    const visible =
      visibleStudents === null ? all : all.filter((r) => r.routedToId === requesterId || visibleStudents.has(r.studentId));
    return toTutoringRequestViews(visible, this.students, this.users, this.sessions);
  }
}

/** Historial propio del tutorado: sus solicitudes con su estado y la respuesta recibida. */
export class ListOwnTutoringRequestsUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly sessions?: SessionRepository,
    private readonly auditLogs?: AuditLogRepository,
  ) {}

  async execute(userId: string): Promise<TutoringRequestView[]> {
    const student = await this.students.findByUserId(userId);
    if (!student) return [];
    const views = await toTutoringRequestViews(await this.requests.findByStudent(student.id), this.students, this.users);
    if (!this.sessions) return views;

    // La cita de cada solicitud (vigente o cancelada) y las que reemplazó, tomadas de la bitácora del reemplazo.
    const logs = this.auditLogs ? await this.auditLogs.findAll({ entity: 'TutoringRequest' }) : [];
    for (const view of views) {
      if (!view.sessionId) continue;
      const session = await this.sessions.findById(view.sessionId);
      if (!session) continue;
      const replacedSessionIds = logs
        .filter((l) => l.entityId === view.id && l.action === 'TUTORING_REQUEST_SESSION')
        .flatMap((l) => [...(l.details ?? '').matchAll(/reemplaza la sesión cancelada ([0-9a-f-]{36})/g)].map((m) => m[1]));
      view.appointment = {
        state: session.cancelledAt ? 'CANCELADA' : 'VIGENTE',
        scheduledAt: session.scheduledAt.toISOString(),
        modality: session.modality,
        place: (session.modality === 'VIRTUAL' ? session.meetingLink : session.location) ?? null,
        replacedSessionIds,
      };
    }
    return views;
  }
}
