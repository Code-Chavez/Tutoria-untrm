import { MailOutcome, MailSendError } from '@application/ports/Mailer';

/** Órdenes SMTP anteriores a la transmisión del mensaje (DATA): hasta ahí el servidor no tiene el cuerpo del correo. */
const BEFORE_DATA = /^(CONN|EHLO|HELO|LHLO|STARTTLS|AUTH\b.*|MAIL FROM|RCPT TO)$/i;
/** Errores que nodemailer produce siempre antes de transmitir el mensaje. */
const ALWAYS_BEFORE_DATA = new Set(['EAUTH', 'EENVELOPE', 'ETLS']);

interface SmtpLikeError {
  message?: unknown;
  code?: unknown;
  command?: unknown;
  responseCode?: unknown;
}

/**
 * Clasifica un fallo de nodemailer según la FASE en que ocurrió y la respuesta del servidor, no por el nombre del error:
 *  - NOT_ACCEPTED solo si hay una respuesta de rechazo del servidor (código 4xx/5xx), o el fallo ocurrió en una orden anterior a
 *    DATA (conexión, saludo, STARTTLS, autenticación, remitente, destinatario), o es un error que nodemailer da siempre antes
 *    de transmitir (autenticación, sobre, TLS).
 *  - Todo lo demás es UNCERTAIN: tiempo agotado o conexión cortada durante o después de DATA, o sin datos de la fase. Si no se
 *    puede demostrar que falló antes de una posible aceptación, se registra como incierto.
 */
export function classifySmtpError(error: unknown): MailOutcome {
  const e = (typeof error === 'object' && error !== null ? error : {}) as SmtpLikeError;
  if (typeof e.responseCode === 'number' && e.responseCode >= 400) return 'NOT_ACCEPTED';
  if (typeof e.command === 'string' && BEFORE_DATA.test(e.command.trim())) return 'NOT_ACCEPTED';
  if (typeof e.code === 'string' && ALWAYS_BEFORE_DATA.has(e.code)) return 'NOT_ACCEPTED';
  return 'UNCERTAIN';
}

export function toMailSendError(error: unknown): MailSendError {
  const e = (typeof error === 'object' && error !== null ? error : {}) as SmtpLikeError;
  const message = typeof e.message === 'string' ? e.message : 'Error al enviar el correo';
  return new MailSendError(message, classifySmtpError(error), typeof e.code === 'string' ? e.code : undefined);
}
