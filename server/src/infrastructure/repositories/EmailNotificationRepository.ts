import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { EmailOutboxRepository } from '@domain/repositories/EmailOutboxRepository';
import { EmailOutboxProcessor } from '@application/services/EmailOutboxProcessor';

type Logger = Pick<Console, 'warn'>;

/**
 * Cada aviso nuevo de la aplicación se refleja también en el correo institucional de la persona. Decora al repositorio real,
 * así que ningún caso de uso cambia ni se entera: el aviso interno es lo que cuenta; el correo es un complemento que nunca
 * retrasa ni hace fallar la operación (un SMTP caído no debe impedir derivar un caso). El correo se encola primero y se envía
 * con reintentos (`EmailOutboxProcessor`), de modo que un fallo temporal o un reinicio no lo pierden.
 */
export class EmailNotificationRepository implements NotificationRepository {
  constructor(
    private readonly inner: NotificationRepository,
    private readonly outbox: EmailOutboxRepository,
    private readonly processor: EmailOutboxProcessor,
    private readonly logger: Logger = console,
  ) {}

  async create(data: Parameters<NotificationRepository['create']>[0]): Promise<Notification> {
    const notification = await this.inner.create(data);
    try {
      await this.outbox.enqueue(notification.id);
      // Sin esperar: el envío no demora la respuesta al usuario. Si falla, el proceso de fondo lo reintenta.
      void this.processor.processNotification(notification.id);
    } catch (error) {
      this.logger.warn(`No se pudo encolar el correo del aviso ${notification.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return notification;
  }

  findByUser(userId: string, limit?: number) {
    return this.inner.findByUser(userId, limit);
  }

  markAllRead(userId: string) {
    return this.inner.markAllRead(userId);
  }

  markRead(id: string, userId: string) {
    return this.inner.markRead(id, userId);
  }
}
