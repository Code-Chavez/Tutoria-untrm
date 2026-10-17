import { TutoringRequest } from '@domain/entities/TutoringRequest';
import { TutoringRequestRepository } from '@domain/repositories/TutoringRequestRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { InvalidTutoringRequestStatusError, TutoringRequestNotFoundError } from './TutoringRequestErrors';
import { canManageTutoringRequest } from './tutoringRequestSupport';

export type TutoringRequestFollowUp = { kind: 'session'; id: string } | { kind: 'referral'; id: string };

/**
 * Hilo entre una solicitud de tutoría y lo que se hace con ella: programar una sesión o derivar el caso. Quien atiende
 * la solicitud parte de ella (estudiante y motivo ya conocidos) y la solicitud queda enlazada a la sesión o derivación
 * creada, sin duplicar la atención y sin que nadie fuera de su alcance pueda vincularla.
 */
export class TutoringRequestLinker {
  constructor(
    private readonly requests: TutoringRequestRepository,
    private readonly guard: StudentAccessGuard,
    private readonly students: StudentRepository,
    private readonly notifications: NotificationRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  /** Valida antes de crear nada: la solicitud existe y es suya, es del estudiante indicado y aún no tiene atención vinculada. */
  async prepare(requesterId: string, requestId: string, studentIds: string[]): Promise<TutoringRequest> {
    const request = await this.requests.findById(requestId);
    // Fuera de su alcance se responde «no encontrada»: no se confirma que exista.
    if (!request || !(await canManageTutoringRequest(this.guard, requesterId, request))) throw new TutoringRequestNotFoundError();
    if (!studentIds.includes(request.studentId)) {
      throw new InvalidTutoringRequestStatusError('La solicitud es de otro estudiante: no se puede vincular a esta atención.');
    }
    if (request.sessionId || request.referralId) {
      throw new InvalidTutoringRequestStatusError(
        `Esta solicitud ya tiene ${request.sessionId ? 'una sesión programada' : 'una derivación'}: no se crea otra atención para la misma solicitud.`,
      );
    }
    return request;
  }

  /** Enlaza lo creado con la solicitud. Devuelve false si otra persona se adelantó (el llamador deshace lo que creó). */
  async attach(requesterId: string, request: TutoringRequest, followUp: TutoringRequestFollowUp, ipAddress?: string): Promise<boolean> {
    const linked = await this.requests.attachFollowUp(
      request.id,
      followUp.kind === 'session' ? { sessionId: followUp.id } : { referralId: followUp.id },
      requesterId,
    );
    if (!linked) return false;

    await this.auditLogs.create({
      userId: requesterId,
      action: followUp.kind === 'session' ? 'TUTORING_REQUEST_SESSION' : 'TUTORING_REQUEST_REFERRAL',
      entity: 'TutoringRequest',
      entityId: request.id,
      details: `${followUp.kind}:${followUp.id}`,
      ipAddress: ipAddress ?? null,
    });

    const student = await this.students.findById(request.studentId);
    if (student?.userId && student.userId !== requesterId) {
      await this.notifications.create({
        userId: student.userId,
        type: 'TUTORING_REQUEST_UPDATED',
        // Con la derivación no se dice adónde fue: es información reservada del caso (HU-30).
        message:
          followUp.kind === 'session'
            ? 'Tu solicitud de tutoría ya tiene una sesión programada: revísala en Mis sesiones'
            : 'Tu solicitud de tutoría tiene novedades: revisa su estado',
        tutoringRequestId: request.id,
      });
    }
    return true;
  }
}
