import { SessionModality } from '@domain/entities/Session';

// Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d): se
// genera al vuelo a partir de las sesiones ya registradas, sin persistirse.
export type ScheduleAttendanceStatus = 'CANCELADA' | 'PROXIMA' | 'EN_CURSO' | 'REALIZADA';

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
  attendanceConfirmed: number;
  attendancePending: number;
  sessions: ScheduleAttendanceSessionRow[];
}

export interface GetScheduleAttendanceReportInput {
  tutorId: string;
  from?: Date;
  to?: Date;
}
