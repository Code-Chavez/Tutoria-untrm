export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Con copia (p. ej. a quien hizo el pedido). */
  cc?: string;
  /** Dónde llegan las respuestas. */
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
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

/**
 * Qué se sabe del resultado de un envío que falló:
 *  - NOT_ACCEPTED: se demostró que el servidor de correo no aceptó el mensaje (falló antes de poder aceptarlo, o lo rechazó).
 *  - UNCERTAIN: no se puede demostrar; el correo pudo haber salido.
 */
export type MailOutcome = 'NOT_ACCEPTED' | 'UNCERTAIN';

/** Fallo de envío con su clasificación. Los transportes lo lanzan cuando saben en qué fase falló. */
export class MailSendError extends Error {
  constructor(
    message: string,
    readonly outcome: MailOutcome,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'MailSendError';
  }
}

/** Clasificación de cualquier error al enviar: lo que no se puede demostrar como no aceptado es incierto. */
export function mailOutcomeOf(error: unknown): MailOutcome {
  if (error instanceof MailSendError) return error.outcome;
  if (error instanceof MailNotConfiguredError) return 'NOT_ACCEPTED';
  return 'UNCERTAIN';
}
