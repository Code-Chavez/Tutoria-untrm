import type { OwnRequestRecipient } from '../services/tutoringRequestService';

/**
 * Antes de enviar: quién recibirá la solicitud y qué hacer después. Dice lo que de verdad ocurre; no promete plazos (los define la
 * DBU). Sin saber a quién llega, no dice nada: la solicitud igual se registra y se enruta.
 */
export function recipientBefore(recipient: OwnRequestRecipient | null): string {
  if (!recipient) return '';
  switch (recipient.kind) {
    case 'tutor':
      return `Tu solicitud la recibirá tu tutor ${recipient.name}. Te avisaremos en el sistema cuando responda.`;
    case 'coordinator':
      return `Aún no tienes tutor asignado: tu solicitud la recibirá la coordinación de tu escuela (${recipient.name}), que te orientará. Te avisaremos en el sistema cuando responda.`;
    case 'none':
      return 'Por ahora no hay una persona disponible para recibir tu solicitud en el sistema, así que todavía no se puede enviar y no queda registrada. Consulta con la coordinación de tu escuela o con Bienestar Universitario.';
    case 'dbu':
      return `Aún no tienes tutor asignado ni tu escuela tiene coordinación: tu solicitud la recibirá Bienestar Universitario (${recipient.name}). Te avisaremos en el sistema cuando responda.`;
  }
}

/** Después de enviar: lo mismo, en pasado. Si no se sabe a quién llegó, cae en el texto de antes (por rol). */
export function recipientAfter(recipient: OwnRequestRecipient | null, routedToRole: 'tutor' | 'coordinator'): string {
  if (!recipient) return `Solicitud registrada y enviada a ${routedToRole === 'tutor' ? 'tu tutor' : 'la coordinación de tu escuela'}. Te avisaremos cuando responda.`;
  if (recipient.kind === 'none') return 'Solicitud registrada. Te avisaremos en el sistema cuando responda.';
  const who = recipient.kind === 'tutor' ? `tu tutor ${recipient.name}` : recipient.kind === 'coordinator' ? `la coordinación de tu escuela (${recipient.name})` : `Bienestar Universitario (${recipient.name})`;
  return `Solicitud registrada: la recibió ${who}. Te avisaremos en el sistema cuando responda.`;
}
