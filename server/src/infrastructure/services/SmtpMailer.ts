import nodemailer, { type Transporter } from 'nodemailer';
import { MailMessage, Mailer, MailNotConfiguredError } from '@application/ports/Mailer';
import { SmtpProgress, toMailSendError } from './smtpOutcome';

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS implícito (puerto 465); en 587/25 se negocia STARTTLS si el servidor lo ofrece. */
  secure: boolean;
  /** Exige STARTTLS cuando no hay TLS implícito: sin él no se envía (nunca en claro). */
  requireTls?: boolean;
  user?: string;
  pass?: string;
  from: string;
  /** Plazos de nodemailer en ms; solo se cambian en las pruebas. */
  timeouts?: { connection: number; greeting: number; socket: number };
}

/** Envío por SMTP: sirve para el correo institucional o cualquier proveedor que lo ofrezca. */
export class SmtpMailer implements Mailer {
  constructor(private readonly config: SmtpConfig) {}

  /**
   * Un transporte por envío: así el registro de órdenes SMTP que ve este envío es solo suyo y se sabe con certeza si llegó a
   * enviarse DATA. Nodemailer no entrega esa fase en el error (informa `command: 'CONN'` en cortes y tiempos agotados aunque el
   * cuerpo ya se haya enviado), por eso se observa con `transactionLog` + un `logger` propio. Ese logger recibe cada orden SMTP (con destinatarios y, según el caso, datos de autenticación), así que
   * NO guarda ni imprime nada de lo que recibe: solo compara con `DATA` y levanta un booleano (hay una prueba que lo vigila).
   */
  private transportFor(progress: SmtpProgress): Transporter {
    const { config } = this;
    const noop = () => undefined;
    const observe = (entry: { tnx?: unknown } | undefined, message?: unknown) => {
      if (entry?.tnx === 'client' && typeof message === 'string' && message.trim().toUpperCase() === 'DATA') progress.dataStarted = true;
    };
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.requireTls && !config.secure ? { requireTLS: true } : {}),
      ...(config.user ? { auth: { user: config.user, pass: config.pass ?? '' } } : {}),
      connectionTimeout: config.timeouts?.connection ?? 10_000,
      greetingTimeout: config.timeouts?.greeting ?? 10_000,
      socketTimeout: config.timeouts?.socket ?? 20_000,
      transactionLog: true,
      logger: { trace: noop, debug: observe, info: noop, warn: noop, error: noop, fatal: noop },
    });
  }

  async send(message: MailMessage): Promise<void> {
    const progress: SmtpProgress = { dataStarted: false };
    try {
      await this.transportFor(progress).sendMail({ from: this.config.from, ...message });
    } catch (error) {
      // Se conserva en qué fase falló: «no aceptado» (demostrado) o «incierto» (pudo haber salido).
      throw toMailSendError(error, progress);
    }
  }
}

/** Sin SMTP configurado el envío falla de forma explícita en lugar de aparentar éxito. */
export class UnconfiguredMailer implements Mailer {
  async send(): Promise<void> {
    throw new MailNotConfiguredError();
  }
}
