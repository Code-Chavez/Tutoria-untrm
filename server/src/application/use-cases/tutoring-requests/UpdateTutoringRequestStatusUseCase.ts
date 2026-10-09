import { TutoringRequestStatus, TutoringRequestView, TUTORING_REQUEST_STATUSES } from '@domain/entities/TutoringRequest';
import { TutoringRequestRepository } from '@domain/repositories/TutoringRequestRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { InvalidTutoringRequestStatusError, TutoringRequestNotFoundError } from './TutoringRequestErrors';
import { canManageTutoringRequest, toTutoringRequestViews } from './tutoringRequestSupport';

export interface UpdateTutoringRequestStatusInput {
  status: TutoringRequestStatus;
  /** Respuesta para el estudiante; obligatoria al marcar la solicitud como atendida. */
  note?: string;
  /** Sesión en la que se atendió; debe incluir al estudiante de la solicitud. */
  sessionId?: string;
}

const STATUS_LABEL: Record<TutoringRequestStatus, string> = {
  PENDIENTE: 'pendiente',
  EN_ATENCION: 'en atención',
  ATENDIDA: 'atendida',
};

/**
 * Da seguimiento a una solicitud de tutoría (R01): PENDIENTE → EN_ATENCION → ATENDIDA, sin retroceder.
 * Lo hacen la DBU, a quien se le enrutó y quien tiene alcance sobre el tutorado. Al atenderla se deja una
 * respuesta para el estudiante y, opcionalmente, la sesión en la que se atendió. Queda en la bitácora y
 * el estudiante recibe un aviso.
 */
export class UpdateTutoringRequestStatusUseCase {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly guard: StudentAccessGuard,
    private readonly students: StudentRepository,
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly notifications: NotificationRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(
    requesterId: string,
    requestId: string,
    input: UpdateTutoringRequestStatusInput,
    ipAddress?: string,
  ): Promise<TutoringRequestView> {
    const request = await this.requests.findById(requestId);
    // Fuera de su alcance se responde «no encontrada»: no se confirma que exista.
    if (!request || !(await canManageTutoringRequest(this.guard, requesterId, request))) {
      throw new TutoringRequestNotFoundError();
    }

    const from = TUTORING_REQUEST_STATUSES.indexOf(request.status);
    const to = TUTORING_REQUEST_STATUSES.indexOf(input.status);
    if (to === -1 || to <= from) {
      throw new InvalidTutoringRequestStatusError(
        `La solicitud ya está ${STATUS_LABEL[request.status]}; el estado solo avanza.`,
      );
    }

    const note = input.note?.trim() || null;
    if (input.status === 'ATENDIDA' && !note) {
      throw new InvalidTutoringRequestStatusError('Escribe la respuesta para el estudiante antes de marcarla atendida.');
    }

    if (input.sessionId) {
      const session = await this.sessions.findById(input.sessionId);
      if (!session || !session.studentIds.includes(request.studentId)) {
        throw new InvalidTutoringRequestStatusError('La sesión indicada no existe o no incluye a este estudiante.');
      }
    }

    const updated = await this.requests.updateAttention(request.id, request.status, {
      status: input.status,
      responseNote: note ?? request.responseNote,
      handledById: requesterId,
      handledAt: new Date(),
      sessionId: input.sessionId ?? request.sessionId,
    });
    if (!updated) {
      throw new InvalidTutoringRequestStatusError('Otra persona acaba de actualizar esta solicitud; recarga e inténtalo de nuevo.');
    }

    await this.auditLogs.create({
      userId: requesterId,
      action: 'TUTORING_REQUEST_STATUS',
      entity: 'TutoringRequest',
      entityId: request.id,
      details: `${request.status} → ${input.status}`,
      ipAddress: ipAddress ?? null,
    });

    const student = await this.students.findById(request.studentId);
    if (student?.userId && student.userId !== requesterId) {
      await this.notifications.create({
        userId: student.userId,
        type: 'TUTORING_REQUEST_UPDATED',
        message: `Tu solicitud de tutoría ahora está ${STATUS_LABEL[input.status]}`,
        tutoringRequestId: request.id,
      });
    }

    return (await toTutoringRequestViews([updated], this.students, this.users))[0];
  }
}
