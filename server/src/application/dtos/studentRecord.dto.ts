import { SupportContact } from '@domain/entities/SupportContact';

// Un evento del expediente (HU-16). Se diseña como unión discriminada para
// poder añadir 'referral' en próximos sprints sin rehacer la línea de tiempo.
export type StudentRecordEventType = 'interview' | 'assignment' | 'attendance' | 'followUp';

export interface InterviewRecordEvent {
  type: 'interview';
  id: string;
  date: Date;
  conductedByName: string;
  motives: string[];
  aspectsDiscussed: string;
  agreements: string;
}

export interface AssignmentRecordEvent {
  type: 'assignment';
  id: string;
  date: Date;
  previousTutorName: string | null;
  newTutorName: string;
  reason: string;
}

// Asistencia confirmada de una sesión individual (HU-22, Anexo N°4).
export interface AttendanceRecordEvent {
  type: 'attendance';
  id: string;
  date: Date;
  sequenceNumber: number;
  topic: string;
  tutorName: string;
  scheduledAt: Date;
}

// Ficha de seguimiento (HU-24, Anexo N°5).
export interface FollowUpRecordEvent {
  type: 'followUp';
  id: string;
  date: Date;
  reason: string;
  agreements: string;
  instructorName: string | null;
  courseName: string | null;
  courseCycle: number | null;
  conductedByName: string;
}

export type StudentRecordEvent =
  | InterviewRecordEvent
  | AssignmentRecordEvent
  | AttendanceRecordEvent
  | FollowUpRecordEvent;

export interface StudentRecord {
  student: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    cycle: number;
    isActive: boolean;
    isAtRisk: boolean;
    riskReason: string | null;
  };
  schoolName: string;
  tutorName: string | null;
  // Solo presente si el solicitante tiene support-contacts:read (HU-15).
  supportContact?: SupportContact | null;
  // Orden cronológico descendente (más reciente primero).
  timeline: StudentRecordEvent[];
}
