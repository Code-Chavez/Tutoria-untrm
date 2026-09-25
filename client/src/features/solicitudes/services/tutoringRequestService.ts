import { apiClient } from '@shared/services/apiClient';

export type TutoringRequestSource = 'STUDENT' | 'INSTRUCTOR';
export type TutoringCaseType = 'ACADEMIC' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'HEALTH';

export interface TutoringRequest {
  id: string;
  studentId: string;
  source: TutoringRequestSource;
  instructorName?: string | null;
  courseName?: string | null;
  caseType: TutoringCaseType;
  reason: string;
  routedToId: string;
  routedToRole: 'tutor' | 'coordinator';
  createdAt: string;
}

export interface CreateTutoringRequestData {
  source: TutoringRequestSource;
  instructorName?: string;
  courseName?: string;
  caseType: TutoringCaseType;
  reason: string;
}

export interface CreateOwnTutoringRequestData {
  caseType: TutoringCaseType;
  reason: string;
}

export const tutoringRequestService = {
  createTutoringRequest: async (
    studentId: string,
    data: CreateTutoringRequestData,
  ): Promise<TutoringRequest> => {
    const response = await apiClient.post<{ message: string; request: TutoringRequest }>(
      `/students/${studentId}/tutoring-requests`,
      data,
    );
    return response.data.request;
  },

  getMyTutoringRequests: async (): Promise<TutoringRequest[]> => {
    const response = await apiClient.get<{ requests: TutoringRequest[] }>(
      '/tutoring-requests?mine=true',
    );
    return response.data.requests;
  },

  // Autoservicio: el propio tutorado solicita tutoría para sí mismo.
  createOwnTutoringRequest: async (
    data: CreateOwnTutoringRequestData,
  ): Promise<TutoringRequest> => {
    const response = await apiClient.post<{ message: string; request: TutoringRequest }>(
      '/tutoring-requests/me',
      data,
    );
    return response.data.request;
  },
};
