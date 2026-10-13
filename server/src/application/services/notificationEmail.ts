import { Notification, NotificationType } from '@domain/entities/Notification';
import { MailMessage } from '@application/ports/Mailer';

const INSTITUTION = 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas';
const AREA = 'Dirección de Bienestar Universitario';
const SYSTEM = 'Sistema Integral de Tutoría (SIT)';

const SUBJECT: Record<NotificationType, string> = {
  REFERRAL_CREATED: 'Nueva derivación recibida',
  REFERRAL_STATUS_CHANGED: 'Actualización del estado de una derivación',
  TUTORING_REQUEST_CREATED: 'Nueva solicitud de tutoría',
  TUTORING_REQUEST_UPDATED: 'Actualización de su solicitud de tutoría',
  TUTORING_REQUEST_RECEIVED: 'Solicitud de tutoría registrada',
};

/** Texto formal de cada aviso. No lleva datos del caso ni de la persona atendida (ver `buildNotificationEmail`). */
const BODY: Record<NotificationType, string> = {
  REFERRAL_CREATED:
    'Le comunicamos que se ha registrado una derivación dirigida a su servicio. Le solicitamos ingresar al sistema para revisarla y gestionar su atención.',
  REFERRAL_STATUS_CHANGED:
    'Le comunicamos que se ha actualizado el estado de una derivación en la que usted participa. Puede revisar el detalle ingresando al sistema.',
  TUTORING_REQUEST_CREATED:
    'Le comunicamos que ha recibido una nueva solicitud de tutoría. Le solicitamos ingresar al sistema para revisarla y atenderla.',
  TUTORING_REQUEST_UPDATED:
    'Le comunicamos que su solicitud de tutoría ha sido actualizada. Puede consultar la respuesta ingresando al sistema.',
  TUTORING_REQUEST_RECEIVED:
    'Le confirmamos que su solicitud de tutoría ha sido registrada en el sistema y remitida a la persona responsable de su atención. Recibirá un aviso cuando tenga respuesta.',
};

const CONFIDENTIALITY =
  'Por la confidencialidad de la información de tutoría, el detalle no se envía por correo electrónico: para consultarlo debe ingresar al sistema con su cuenta institucional.';

/** Misma ruta a la que lleva el aviso de la campana dentro de la aplicación. */
function deepLink(notification: Notification, appUrl: string): string {
  const base = appUrl.replace(/\/+$/, '');
  if (notification.referralId) return `${base}/derivaciones?caso=${notification.referralId}`;
  if (notification.type === 'TUTORING_REQUEST_CREATED' && notification.tutoringRequestId) {
    return `${base}/solicitudes?solicitud=${notification.tutoringRequestId}`;
  }
  if (notification.type === 'TUTORING_REQUEST_UPDATED' || notification.type === 'TUTORING_REQUEST_RECEIVED') return `${base}/solicitar-tutoria`;
  return base;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Correo formal que acompaña a un aviso, con versión de texto y de HTML. **No lleva el texto del aviso**: ese texto puede nombrar
 * al tutorado o al servicio, y los datos de tutoría son confidenciales (Ley N.° 29733). El correo solo informa que hay algo nuevo y
 * lleva al sistema, donde el acceso exige iniciar sesión y se aplican los permisos de cada rol.
 */
export function buildNotificationEmail(
  notification: Notification,
  recipient: { email: string; firstName: string; lastName?: string },
  appUrl: string,
): MailMessage {
  const link = deepLink(notification, appUrl);
  const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim();
  const greeting = `Estimado(a) ${name}:`;
  const subject = `${SUBJECT[notification.type]} — SIT UNTRM`;

  const text = [
    greeting,
    '',
    BODY[notification.type],
    '',
    `Acceso directo: ${link}`,
    '',
    CONFIDENTIALITY,
    '',
    'Atentamente,',
    AREA,
    INSTITUTION,
    SYSTEM,
    '',
    'Este es un mensaje automático: por favor, no responda a este correo. Si no esperaba este aviso, puede ignorarlo.',
  ].join('\n');

  const safeLink = escapeHtml(link);
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#1a2433;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f8;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:#14315f;color:#ffffff;padding:20px 28px;">
<div style="font-size:12px;letter-spacing:.5px;text-transform:uppercase;opacity:.85;">${escapeHtml(INSTITUTION)}</div>
<div style="font-size:18px;font-weight:bold;margin-top:4px;">${escapeHtml(AREA)}</div>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 14px;">${escapeHtml(BODY[notification.type])}</p>
<p style="margin:22px 0;text-align:center;"><a href="${safeLink}" style="background:#14315f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;display:inline-block;">Ingresar al sistema</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#5b6677;">Si el botón no funciona, copie esta dirección en su navegador:<br><a href="${safeLink}" style="color:#14315f;word-break:break-all;">${safeLink}</a></p>
<p style="margin:18px 0 0;font-size:13px;color:#5b6677;">${escapeHtml(CONFIDENTIALITY)}</p>
<p style="margin:24px 0 0;">Atentamente,<br><strong>${escapeHtml(AREA)}</strong><br>${escapeHtml(INSTITUTION)}<br>${escapeHtml(SYSTEM)}</p>
</td></tr>
<tr><td style="background:#f2f5f8;color:#7a8596;font-size:11px;padding:14px 28px;">Mensaje automático: por favor, no responda a este correo. Si no esperaba este aviso, puede ignorarlo.</td></tr>
</table></td></tr></table></body></html>`;

  return { to: recipient.email, subject, text, html };
}
