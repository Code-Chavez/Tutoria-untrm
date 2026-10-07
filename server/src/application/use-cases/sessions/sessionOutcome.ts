import { SessionWithParticipants } from '@domain/entities/Session';

/**
 * Resultado de una sesión (A07). Una sesión solo es «realizada» cuando consta que
 * asistió al menos un participante: haber pasado la hora no basta. Es la única
 * definición que usan los reportes, los indicadores y el informe semestral.
 */
export type SessionOutcome =
  | 'CANCELADA'
  | 'PROXIMA'
  | 'EN_CURSO'
  | 'REALIZADA'
  | 'INASISTENCIA'
  | 'POR_REGISTRAR';

export function sessionOutcome(session: SessionWithParticipants, now: Date): SessionOutcome {
  if (session.cancelledAt) return 'CANCELADA';
  if (now < session.scheduledAt) return 'PROXIMA';
  if (session.attendedStudentIds.length > 0) return 'REALIZADA';
  if (now <= session.endsAt) return 'EN_CURSO';
  return session.absentStudentIds.length > 0 ? 'INASISTENCIA' : 'POR_REGISTRAR';
}

/** Sesión realizada: con asistentes registrados (no cancelada y ya iniciada). */
export const isHeldSession = (session: SessionWithParticipants, now: Date): boolean =>
  sessionOutcome(session, now) === 'REALIZADA';
