import { Notification, NotificationType } from '@domain/entities/Notification';
import { MailMessage } from '@application/ports/Mailer';

const SUBJECT: Record<NotificationType, string> = {
  REFERRAL_CREATED: 'Nueva derivación recibida',
  REFERRAL_STATUS_CHANGED: 'Cambió el estado de una derivación',
  TUTORING_REQUEST_CREATED: 'Nueva solicitud de tutoría',
  TUTORING_REQUEST_UPDATED: 'Tu solicitud de tutoría fue actualizada',
};

const HEADLINE: Record<NotificationType, string> = {
  REFERRAL_CREATED: 'Se registró una derivación para tu servicio.',
  REFERRAL_STATUS_CHANGED: 'Una derivación que sigues cambió de estado.',
  TUTORING_REQUEST_CREATED: 'Recibiste una solicitud de tutoría.',
  TUTORING_REQUEST_UPDATED: 'Tu solicitud de tutoría tiene novedades.',
};

/** Misma ruta a la que lleva el aviso de la campana dentro de la aplicación. */
function deepLink(notification: Notification, appUrl: string): string {
  const base = appUrl.replace(/\/+$/, '');
  if (notification.referralId) return `${base}/derivaciones?caso=${notification.referralId}`;
  if (notification.type === 'TUTORING_REQUEST_CREATED' && notification.tutoringRequestId) {
    return `${base}/solicitudes?solicitud=${notification.tutoringRequestId}`;
  }
  if (notification.type === 'TUTORING_REQUEST_UPDATED') return `${base}/solicitar-tutoria`;
  return base;
}

/**
 * Correo que acompaña a un aviso. **No lleva el texto del aviso**: ese texto puede nombrar al tutorado o al servicio, y los
 * datos de tutoría son confidenciales (Ley N.° 29733). El correo solo avisa que hay algo nuevo y lleva al sistema, donde
 * el acceso exige iniciar sesión y se aplican los permisos de cada rol.
 */
export function buildNotificationEmail(
  notification: Notification,
  recipient: { email: string; firstName: string },
  appUrl: string,
): MailMessage {
  const link = deepLink(notification, appUrl);
  return {
    to: recipient.email,
    subject: `${SUBJECT[notification.type]} — SIT UNTRM`,
    text:
      `Hola ${recipient.firstName},\n\n` +
      `${HEADLINE[notification.type]}\n\n` +
      `Por la confidencialidad de los datos de tutoría, el detalle no se envía por correo. Ingresa al sistema para verlo:\n${link}\n\n` +
      `Si no esperabas este mensaje, puedes ignorarlo. Este correo es automático: no lo respondas.`,
  };
}
