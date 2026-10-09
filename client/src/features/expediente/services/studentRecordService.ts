import { apiClient } from '@shared/services/apiClient';

interface InterviewRecordEvent {
  type: 'interview';
  id: string;
  date: string;
  conductedByName: string;
  motives: string[];
  aspectsDiscussed: string;
  agreements: string;
}

interface AssignmentRecordEvent {
  type: 'assignment';
  id: string;
  date: string;
  previousTutorName: string | null;
  newTutorName: string;
  reason: string;
}

interface AttendanceRecordEvent {
  type: 'attendance';
  id: string;
  date: string;
  sequenceNumber: number;
  topic: string;
  tutorName: string;
  scheduledAt: string;
}

interface FollowUpRecordEvent {
  type: 'followUp';
  id: string;
  date: string;
  reason: string;
  agreements: string;
  instructorName: string | null;
  courseName: string | null;
  courseCycle: number | null;
  conductedByName: string;
}

// Derivación a un servicio de la DBU (HU-35). Solo visible si el rol
// solicitante tiene visibilidad de seguimiento (Docente Tutor emisor o
// Administrador DBU); no incluye motivo ni aspectos observados.
interface ReferralRecordEvent {
  type: 'referral';
  id: string;
  date: string;
  service: 'ESCUELA' | 'PSICOPEDAGOGIA' | 'PSICOLOGIA' | 'ASISTENCIA_SOCIAL' | 'SALUD';
  status: 'ENVIADO' | 'RECIBIDO' | 'EN_ATENCION' | 'ATENDIDO' | 'CERRADO';
  receivingInstance: string | null;
}

// Solicitud de tutoría (R01).
interface TutoringRequestRecordEvent {
  type: 'tutoringRequest';
  id: string;
  date: string;
  caseType: 'ACADEMIC' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'HEALTH';
  source: 'STUDENT' | 'INSTRUCTOR';
  reason: string;
  status: 'PENDIENTE' | 'EN_ATENCION' | 'ATENDIDA';
  routedToName: string;
  responseNote: string | null;
  handledByName: string | null;
  handledAt: string | null;
}

export type StudentRecordEvent =
  | InterviewRecordEvent
  | AssignmentRecordEvent
  | AttendanceRecordEvent
  | FollowUpRecordEvent
  | ReferralRecordEvent
  | TutoringRequestRecordEvent;

export interface SupportContactRecord {
  fullName: string;
  relationship: string;
  age?: number | null;
  occupation?: string | null;
  phone: string;
}

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
  // Ausente si el rol no tiene support-contacts:read (HU-15); null si no hay
  // contacto registrado; con datos si existe.
  supportContact?: SupportContactRecord | null;
  timeline: StudentRecordEvent[];
}

export const studentRecordService = {
  getStudentRecord: async (studentId: string): Promise<StudentRecord> => {
    const response = await apiClient.get<{ record: StudentRecord }>(
      `/students/${studentId}/record`,
    );
    return response.data.record;
  },
};
