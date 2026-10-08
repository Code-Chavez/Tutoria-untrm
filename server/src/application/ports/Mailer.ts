export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Envío de correo electrónico (recuperación de contraseña). */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** No hay servidor de correo configurado: el envío falla en vez de aparentar éxito. */
export class MailNotConfiguredError extends Error {
  constructor() {
    super('El servidor de correo no está configurado (SMTP_HOST)');
    this.name = 'MailNotConfiguredError';
  }
}
