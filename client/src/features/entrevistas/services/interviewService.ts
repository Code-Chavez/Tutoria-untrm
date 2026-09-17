import { apiClient } from '@shared/services/apiClient';

export interface TutorInterview {
  id: string;
  studentId: string;
  conductedById: string;
  birthDate?: string | null;
  originPlace?: string | null;
  age?: number | null;
  religion?: string | null;
  maritalStatus?: string | null;
  siblingsOrder?: string | null;
  address?: string | null;
  admissionYear?: number | null;
  motiveAcademic: boolean;
  motivePersonalEmotional: boolean;
  motiveVocational: boolean;
  motiveDetail?: string | null;
  aspectsDiscussed: string;
  agreements: string;
  createdAt: string;
}

export interface CreateInterviewData {
  birthDate?: string;
  originPlace?: string;
  age?: number;
  religion?: string;
  maritalStatus?: string;
  siblingsOrder?: string;
  address?: string;
  admissionYear?: number;
  motiveAcademic: boolean;
  motivePersonalEmotional: boolean;
  motiveVocational: boolean;
  motiveDetail?: string;
  aspectsDiscussed: string;
  agreements: string;
}

export const interviewService = {
  createInterview: async (studentId: string, data: CreateInterviewData): Promise<TutorInterview> => {
    const response = await apiClient.post<{ message: string; interview: TutorInterview }>(
      `/students/${studentId}/interviews`,
      data,
    );
    return response.data.interview;
  },

  getInterviewsByStudent: async (studentId: string): Promise<TutorInterview[]> => {
    const response = await apiClient.get<{ interviews: TutorInterview[] }>(
      `/students/${studentId}/interviews`,
    );
    return response.data.interviews;
  },
};
