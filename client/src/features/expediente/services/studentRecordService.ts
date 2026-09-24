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

export type StudentRecordEvent = InterviewRecordEvent | AssignmentRecordEvent;

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
