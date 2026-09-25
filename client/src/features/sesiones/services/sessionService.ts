import { apiClient } from '@shared/services/apiClient';

// Modalidad de la sesión (Art. 8): presencial registra el lugar, virtual el
// enlace de videollamada.
export type SessionModality = 'PRESENCIAL' | 'VIRTUAL';

// Asistencia de una sesión individual (Anexo N°4): reemplaza la firma del
// tutorado por una confirmación digital.
export interface SessionAttendance {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  confirmedAt: string;
  createdAt: string;
}

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
  attendance: SessionAttendance | null;
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

  // Registra la asistencia de una sesión individual (HU-22, Anexo N°4).
  registerAttendance: async (sessionId: string): Promise<TutoringSession> => {
    const response = await apiClient.post<{ message: string; session: TutoringSession }>(
      `/sessions/${sessionId}/attendance`,
    );
    return response.data.session;
  },
};
