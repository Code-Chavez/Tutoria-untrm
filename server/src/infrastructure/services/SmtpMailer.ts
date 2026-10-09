import nodemailer, { type Transporter } from 'nodemailer';
import { MailMessage, Mailer, MailNotConfiguredError } from '@application/ports/Mailer';

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS implícito (puerto 465); en 587/25 se negocia STARTTLS si el servidor lo ofrece. */
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/** Envío por SMTP: sirve para el correo institucional o cualquier proveedor que lo ofrezca. */
export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user ? { auth: { user: config.user, pass: config.pass ?? '' } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, ...message });
  }
}

/** Sin SMTP configurado el envío falla de forma explícita en lugar de aparentar éxito. */
export class UnconfiguredMailer implements Mailer {
  async send(): Promise<void> {
    throw new MailNotConfiguredError();
  }
}
