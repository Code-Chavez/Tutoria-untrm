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

export type StudentRecordEvent =
  | InterviewRecordEvent
  | AssignmentRecordEvent
  | AttendanceRecordEvent
  | FollowUpRecordEvent;

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
