import { SupportContact } from '@domain/entities/SupportContact';
import { ReferralService, ReferralStatus } from '@domain/entities/StudentReferral';

// Un evento del expediente (HU-16).
export type StudentRecordEventType = 'interview' | 'assignment' | 'attendance' | 'followUp' | 'referral';

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

// Derivación a un servicio de la DBU (HU-28/HU-35). No incluye motivo ni
// aspectos observados: en el expediente se muestra solo el resumen que ya es
// visible en la bandeja de derivaciones (HU-30), no el detalle confidencial.
export interface ReferralRecordEvent {
  type: 'referral';
  id: string;
  date: Date;
  service: ReferralService;
  status: ReferralStatus;
  receivingInstance: string | null;
}

export type StudentRecordEvent =
  | InterviewRecordEvent
  | AssignmentRecordEvent
  | AttendanceRecordEvent
  | FollowUpRecordEvent
  | ReferralRecordEvent;

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
