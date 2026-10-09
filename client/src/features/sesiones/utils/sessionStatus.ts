import { TutoringSession } from '../services/sessionService';

// REALIZADA exige que conste la asistencia de alguien (A07): haber pasado la hora no basta.
// INASISTENCIA = ya pasó y se registró que nadie asistió; POR_REGISTRAR = ya pasó y falta registrarlo.
export type SessionStatus =
  | 'CANCELADA'
  | 'PROXIMA'
  | 'EN_CURSO'
  | 'REALIZADA'
  | 'INASISTENCIA'
  | 'POR_REGISTRAR';

// Salvo la cancelación (HU-23) y la asistencia, el estado se deriva de la hora actual contra el horario.
export function getSessionStatus(session: TutoringSession, now: Date = new Date()): SessionStatus {
  if (session.cancelledAt) return 'CANCELADA';
  const start = new Date(session.scheduledAt);
  const end = new Date(session.endsAt);
  if (now < start) return 'PROXIMA';
  if ((session.attendedStudentIds ?? []).length > 0) return 'REALIZADA';
  if (now <= end) return 'EN_CURSO';
  return (session.absentStudentIds ?? []).length > 0 ? 'INASISTENCIA' : 'POR_REGISTRAR';
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
  INASISTENCIA: 'Sin asistentes',
  POR_REGISTRAR: 'Asistencia por registrar',
};

/** Aún se puede reprogramar o cancelar: no empezó o está en curso sin asistencia registrada. */
export const isModifiable = (status: SessionStatus): boolean => status === 'PROXIMA' || status === 'EN_CURSO';
