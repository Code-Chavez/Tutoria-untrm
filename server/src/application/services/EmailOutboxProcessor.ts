import { UserRepository } from '@domain/repositories/UserRepository';
import { EmailOutboxRepository, OutboxItem } from '@domain/repositories/EmailOutboxRepository';
import { Mailer } from '@application/ports/Mailer';
import { buildNotificationEmail } from './notificationEmail';

type Logger = Pick<Console, 'warn' | 'error'>;

/** Espera tras cada fallo (1.º, 2.º, 3.º y 4.º); al 5.º fallo seguido el correo se da por fallido. */
export const RETRY_DELAYS_MINUTES = [1, 5, 15, 60];
export const MAX_ATTEMPTS = RETRY_DELAYS_MINUTES.length + 1;
/** Mientras un envío está en curso la entrada queda apartada; si el proceso muere, vuelve a estar disponible después. */
export const LEASE_MS = 5 * 60_000;

/**
 * Entrega los correos de los avisos con reintentos (A10). La entrada se guarda antes de enviar y solo se marca como enviada
 * cuando el servidor SMTP la acepta, de modo que un SMTP caído o un reinicio no pierden el correo. La garantía es «al menos una vez»:
 * si el proceso muere justo después de que el SMTP aceptó y antes de marcarla, el reintento podría duplicarlo.
 * «Aceptado por el servidor SMTP» no es «llegó a la bandeja».
 */
export class EmailOutboxProcessor {
  constructor(
    private readonly outbox: EmailOutboxRepository,
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly appUrl: string,
    private readonly logger: Logger = console,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Intento inmediato del aviso recién creado. Nunca lanza: el correo no debe romper la operación que lo originó. */
  async processNotification(notificationId: string): Promise<void> {
    try {
      const item = await this.outbox.claimForNotification(notificationId, this.now(), LEASE_MS);
      if (item) await this.attempt(item);
    } catch (error) {
      this.logger.warn(`No se pudo procesar el correo del aviso ${notificationId}: ${describe(error)}`);
    }
  }

  /** Reintenta lo pendiente cuyo momento llegó (lo invoca el proceso de fondo). Devuelve cuántas entradas atendió. */
  async processDue(limit = 20): Promise<number> {
    const items = await this.outbox.claimDue(this.now(), limit, LEASE_MS);
    for (const item of items) await this.attempt(item);
    return items.length;
  }

  private async attempt(item: OutboxItem): Promise<void> {
    const recipient = await this.users.findById(item.notification.userId);
    if (!recipient?.isActive || !recipient.email) {
      await this.outbox.markSkipped(item.id, 'La persona ya no tiene una cuenta activa con correo');
      return;
    }
    try {
      await this.mailer.send(buildNotificationEmail(item.notification, recipient, this.appUrl));
      await this.outbox.markSent(item.id, this.now());
    } catch (error) {
      const attempts = item.attempts + 1;
      const reason = describe(error);
      if (attempts >= MAX_ATTEMPTS) {
        await this.outbox.markFailed(item.id, attempts, reason, null);
        // Sin datos de la persona ni del caso: solo el aviso y el motivo técnico.
        this.logger.error(`[correo] El aviso ${item.notification.id} no se pudo entregar tras ${attempts} intentos: ${reason}`);
      } else {
        const delay = RETRY_DELAYS_MINUTES[attempts - 1];
        await this.outbox.markFailed(item.id, attempts, reason, new Date(this.now().getTime() + delay * 60_000));
        this.logger.warn(`[correo] Aviso ${item.notification.id}: intento ${attempts} fallido (${reason}); se reintenta en ${delay} min`);
      }
    }
  }
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));
