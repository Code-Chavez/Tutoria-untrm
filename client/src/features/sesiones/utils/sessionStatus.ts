import { TutoringSession } from '../services/sessionService';

export type SessionStatus = 'CANCELADA' | 'PROXIMA' | 'EN_CURSO' | 'REALIZADA';

// El estado no vive en un campo propio salvo la cancelación (HU-23); el
// resto se deriva de la hora actual contra el horario, que es toda la
// información disponible.
export function getSessionStatus(session: TutoringSession, now: Date = new Date()): SessionStatus {
  if (session.cancelledAt) return 'CANCELADA';
  const start = new Date(session.scheduledAt);
  const end = new Date(session.endsAt);
  if (now < start) return 'PROXIMA';
  if (now > end) return 'REALIZADA';
  return 'EN_CURSO';
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};
