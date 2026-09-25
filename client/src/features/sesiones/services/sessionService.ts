import { apiClient } from '@shared/services/apiClient';

export interface TutoringSession {
  id: string;
  tutorId: string;
  topic: string;
  scheduledAt: string;
  durationMinutes: number;
  endsAt: string;
  studentIds: string[];
  createdAt: string;
}

export interface ScheduleSessionData {
  studentId: string;
  topic: string;
  scheduledAt: string; // ISO datetime
}

export const sessionService = {
  scheduleSession: async (data: ScheduleSessionData): Promise<TutoringSession> => {
    const response = await apiClient.post<{ message: string; session: TutoringSession }>(
      '/sessions',
      data,
    );
    return response.data.session;
  },

  getMySessions: async (): Promise<TutoringSession[]> => {
    const response = await apiClient.get<{ sessions: TutoringSession[] }>('/sessions?mine=true');
    return response.data.sessions;
  },
};
