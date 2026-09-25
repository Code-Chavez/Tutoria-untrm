import { apiClient } from '@shared/services/apiClient';

// Modalidad de la sesión (Art. 8): presencial registra el lugar, virtual el
// enlace de videollamada.
export type SessionModality = 'PRESENCIAL' | 'VIRTUAL';

export interface TutoringSession {
  id: string;
  tutorId: string;
  topic: string;
  scheduledAt: string;
  durationMinutes: number;
  endsAt: string;
  modality: SessionModality;
  location: string | null;
  meetingLink: string | null;
  studentIds: string[];
  createdAt: string;
}

export interface ScheduleSessionData {
  // Uno o más tutorados: 1 = sesión individual, 2+ = grupal (Art. 7.b).
  studentIds: string[];
  topic: string;
  scheduledAt: string; // ISO datetime
  modality: SessionModality;
  location?: string;
  meetingLink?: string;
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
