import { SessionWithParticipants } from '@domain/entities/Session';
import { NotificationType } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';

/** Qué se hizo con la sesión: de ahí salen el tipo y el texto del aviso. */
export type SessionEvent =
  | { kind: 'scheduled' }
  | { kind: 'rescheduled'; previousScheduledAt: Date; reason: string }
  | { kind: 'cancelled'; reason: string };

/** Cuántos participantes recibieron el aviso y a cuántos el sistema no pudo avisar (sin cuenta del portal, o falló el aviso). */
export interface SessionNotice {
  notified: number;
  notReached: number;
}

const TYPE_OF: Record<SessionEvent['kind'], NotificationType> = {
  scheduled: 'SESSION_SCHEDULED',
  rescheduled: 'SESSION_RESCHEDULED',
  cancelled: 'SESSION_CANCELLED',
};

const when = (date: Date) => date.toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Lima' });

/** Dónde será: el lugar si es presencial; si es virtual, se remite a «Mis sesiones», donde está el enlace. */
const where = (session: SessionWithParticipants) =>
  session.modality === 'VIRTUAL' ? 'Modalidad virtual: el enlace está en «Mis sesiones».' : `Lugar: ${session.location ?? 'por confirmar'}.`;

/** Texto del aviso interno (el correo que lo acompaña es genérico y no lleva estos datos). */
export function sessionNoticeMessage(session: SessionWithParticipants, event: SessionEvent): string {
  switch (event.kind) {
    case 'scheduled':
      return `Tu tutor programó una sesión de tutoría (${when(session.scheduledAt)}). ${where(session)}`;
    case 'rescheduled':
      return `Tu sesión de tutoría cambió de horario (antes: ${when(event.previousScheduledAt)}; ahora: ${when(session.scheduledAt)}). Motivo: ${event.reason}. ${where(session)}`;
    case 'cancelled':
      return `Se canceló tu sesión de tutoría (${when(session.scheduledAt)}). Motivo: ${event.reason}.`;
  }
}

/**
 * Avisa a los tutorados de una sesión cuando se programa, se reprograma o se cancela: cada participante con cuenta de portal
 * recibe un aviso en el sistema (y su correo, por el decorador del repositorio de avisos). Sin cuenta de portal el sistema no
 * puede avisar: se informa a quien hizo el cambio para que lo comunique por otro medio. Es de mejor esfuerzo: un aviso que falla no
 * deshace la sesión ni el cambio.
 */
export class SessionNotifier {
  constructor(
    private readonly students: StudentRepository,
    private readonly notifications: NotificationRepository,
    private readonly logger: Pick<Console, 'warn'> = console,
  ) {}

  /** `alreadyNotified`: participantes que ya recibieron un aviso por este mismo hecho (p. ej. por el vínculo con su solicitud). */
  async notify(session: SessionWithParticipants, event: SessionEvent, alreadyNotified: ReadonlySet<string> = new Set()): Promise<SessionNotice> {
    const notice: SessionNotice = { notified: 0, notReached: 0 };
    const message = sessionNoticeMessage(session, event);
    for (const studentId of session.studentIds) {
      if (alreadyNotified.has(studentId)) {
        notice.notified += 1;
        continue;
      }
      const student = await this.students.findById(studentId);
      if (!student?.userId) {
        notice.notReached += 1;
        continue;
      }
      try {
        await this.notifications.create({ userId: student.userId, type: TYPE_OF[event.kind], message, sessionId: session.id });
        notice.notified += 1;
      } catch (error) {
        // Sin datos del caso en el registro: solo qué evento y qué sesión.
        this.logger.warn(`No se pudo crear el aviso ${TYPE_OF[event.kind]} de la sesión ${session.id}: ${error instanceof Error ? error.name : 'error'}`);
        notice.notReached += 1;
      }
    }
    return notice;
  }
}
