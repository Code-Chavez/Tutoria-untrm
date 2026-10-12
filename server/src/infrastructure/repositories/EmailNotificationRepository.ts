import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { Mailer } from '@application/ports/Mailer';
import { buildNotificationEmail } from '@application/services/notificationEmail';

type Logger = Pick<Console, 'warn'>;

/**
 * Cada aviso nuevo de la aplicación se refleja también en el correo institucional de la persona. Decora al repositorio real,
 * así que ningún caso de uso cambia ni se entera: el aviso interno es lo que cuenta; el correo es un complemento de mejor esfuerzo,
 * que nunca retrasa ni hace fallar la operación (un SMTP caído no debe impedir derivar un caso).
 */
export class EmailNotificationRepository implements NotificationRepository {
  constructor(
    private readonly inner: NotificationRepository,
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly appUrl: string,
    private readonly logger: Logger = console,
  ) {}

  async create(data: Parameters<NotificationRepository['create']>[0]): Promise<Notification> {
    const notification = await this.inner.create(data);
    // Sin esperar: el envío no demora la respuesta al usuario.
    void this.sendEmail(notification);
    return notification;
  }

  /** Visible para las pruebas: resuelve cuando el intento de envío terminó (bien o mal). */
  async sendEmail(notification: Notification): Promise<void> {
    try {
      const recipient = await this.users.findById(notification.userId);
      if (!recipient?.isActive || !recipient.email) return;
      await this.mailer.send(buildNotificationEmail(notification, recipient, this.appUrl));
    } catch (error) {
      this.logger.warn(`No se pudo enviar el correo del aviso ${notification.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
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
