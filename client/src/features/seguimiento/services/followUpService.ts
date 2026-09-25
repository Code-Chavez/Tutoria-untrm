import { apiClient } from '@shared/services/apiClient';

export interface TutorFollowUp {
  id: string;
  studentId: string;
  conductedById: string;
  reason: string;
  agreements: string;
  instructorName?: string | null;
  courseName?: string | null;
  courseCycle?: number | null;
  createdAt: string;
}

export interface CreateFollowUpData {
  reason: string;
  agreements: string;
  withInstructor: boolean;
  instructorName?: string;
  courseName?: string;
  courseCycle?: number;
}

export const followUpService = {
  createFollowUp: async (
    studentId: string,
    data: CreateFollowUpData,
  ): Promise<TutorFollowUp> => {
    const response = await apiClient.post<{ message: string; followUp: TutorFollowUp }>(
      `/students/${studentId}/follow-ups`,
      data,
    );
    return response.data.followUp;
  },

  getFollowUpsByStudent: async (studentId: string): Promise<TutorFollowUp[]> => {
    const response = await apiClient.get<{ followUps: TutorFollowUp[] }>(
      `/students/${studentId}/follow-ups`,
    );
    return response.data.followUps;
  },
};
