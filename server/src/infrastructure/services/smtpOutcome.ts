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

/** Hasta dónde llegó este envío, observado por el propio transporte (ver SmtpMailer). */
export interface SmtpProgress {
  /** Ya se envió la orden DATA: desde ese instante el servidor pudo recibir (y aceptar) el mensaje. */
  dataStarted: boolean;
}

/**
 * Clasifica un fallo de nodemailer según la FASE en que ocurrió y la respuesta del servidor, no por el nombre del error:
 *  - NOT_ACCEPTED solo si hay una respuesta de rechazo del servidor (código 4xx/5xx), o el fallo ocurrió antes de enviar la orden
 *    DATA (conexión, saludo, STARTTLS, autenticación, remitente, destinatario).
 *  - Todo lo demás es UNCERTAIN: tiempo agotado o conexión cortada durante o después de DATA. Si no se puede demostrar que
 *    falló antes de una posible aceptación, se registra como incierto.
 *
 * La fase la da `progress`, que SmtpMailer rellena al ver salir la orden DATA. NO se puede deducir de `error.command`:
 * nodemailer informa `command: 'CONN'` en los cortes de conexión y los tiempos agotados aunque ocurran con el cuerpo ya enviado,
 * así que `CONN` no prueba que fuera «antes de DATA». Sin `progress` (quien llama no observó la fase) se conserva la deducción
 * por `command`, que solo es fiable para los errores que nodemailer asocia a una orden concreta.
 */
export function classifySmtpError(error: unknown, progress?: SmtpProgress): MailOutcome {
  const e = (typeof error === 'object' && error !== null ? error : {}) as SmtpLikeError;
  if (typeof e.responseCode === 'number' && e.responseCode >= 400) return 'NOT_ACCEPTED';
  if (progress) return progress.dataStarted ? 'UNCERTAIN' : 'NOT_ACCEPTED';
  if (typeof e.command === 'string' && BEFORE_DATA.test(e.command.trim())) return 'NOT_ACCEPTED';
  if (typeof e.code === 'string' && ALWAYS_BEFORE_DATA.has(e.code)) return 'NOT_ACCEPTED';
  return 'UNCERTAIN';
}

export function toMailSendError(error: unknown, progress?: SmtpProgress): MailSendError {
  const e = (typeof error === 'object' && error !== null ? error : {}) as SmtpLikeError;
  const message = typeof e.message === 'string' ? e.message : 'Error al enviar el correo';
  return new MailSendError(message, classifySmtpError(error, progress), typeof e.code === 'string' ? e.code : undefined);
}
