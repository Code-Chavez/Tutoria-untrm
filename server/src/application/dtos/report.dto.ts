import { SessionModality } from '@domain/entities/Session';

// Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d): se
// genera al vuelo a partir de las sesiones ya registradas, sin persistirse.
// REALIZADA exige asistentes registrados (A07); INASISTENCIA = nadie asistió; POR_REGISTRAR = ya pasó y falta registrar la asistencia.
export type ScheduleAttendanceStatus =
  | 'CANCELADA'
  | 'PROXIMA'
  | 'EN_CURSO'
  | 'REALIZADA'
  | 'INASISTENCIA'
  | 'POR_REGISTRAR';

export interface ScheduleAttendanceSessionRow {
  id: string;
  topic: string;
  scheduledAt: Date;
  durationMinutes: number;
  modality: SessionModality;
  studentNames: string[];
  status: ScheduleAttendanceStatus;
  // null cuando no aplica (sesión grupal): la asistencia individual (Anexo
  // N°4) solo existe para sesiones de un tutorado.
  attendanceConfirmed: boolean | null;
  /** Cuántos de los programados asistieron; null si aún no se registró la asistencia. */
  attendedCount: number | null;
  participantCount: number;
}

export interface ScheduleAttendanceReport {
  tutorId: string;
  tutorName: string;
  periodFrom: Date | null;
  periodTo: Date | null;
  generatedAt: Date;
  totalSessions: number;
  individualSessions: number;
  groupSessions: number;
  cancelledSessions: number;
  /** Sesiones realizadas: con al menos un asistente registrado. */
  heldSessions: number;
  /** Sesiones ya pasadas en que nadie asistió. */
  noShowSessions: number;
  /** Sesiones ya pasadas con la asistencia sin registrar. */
  pendingRollSessions: number;
  attendanceConfirmed: number;
  attendancePending: number;
  sessions: ScheduleAttendanceSessionRow[];
}

export interface GetScheduleAttendanceReportInput {
  /** Quien pide el informe; decide a qué tutores puede consultar. */
  requesterId: string;
  tutorId: string;
  from?: Date;
  to?: Date;
}
