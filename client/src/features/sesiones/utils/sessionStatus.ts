import { TutoringSession } from '../services/sessionService';

export type SessionStatus = 'PROXIMA' | 'EN_CURSO' | 'REALIZADA';

// La sesión todavía no guarda un estado propio (llegará con HU-23, que
// permitirá cancelarla o reprogramarla); mientras tanto se deriva de la
// hora actual contra su horario, que es toda la información disponible.
export function getSessionStatus(session: TutoringSession, now: Date = new Date()): SessionStatus {
  const start = new Date(session.scheduledAt);
  const end = new Date(session.endsAt);
  if (now < start) return 'PROXIMA';
  if (now > end) return 'REALIZADA';
  return 'EN_CURSO';
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};
