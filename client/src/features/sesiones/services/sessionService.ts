import { apiClient } from '@shared/services/apiClient';

// Dispara la descarga de un blob en el navegador.
function saveBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

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
  // Cancelación (HU-23): no nulo = cancelada. La sesión se conserva (trazabilidad).
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface RescheduleSessionData {
  scheduledAt: string; // ISO datetime
  reason: string;
}

export interface CancelSessionData {
  reason: string;
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

// Evidencia (PDF o imagen) adjunta a una sesión (HU-25, repositorio seguro
// que respalda los informes semestrales).
export interface SessionEvidence {
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: string;
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

  // Reprograma o cancela una sesión con motivo obligatorio (HU-23).
  rescheduleSession: async (
    sessionId: string,
    data: RescheduleSessionData,
  ): Promise<TutoringSession> => {
    const response = await apiClient.patch<{ message: string; session: TutoringSession }>(
      `/sessions/${sessionId}/reschedule`,
      data,
    );
    return response.data.session;
  },

  cancelSession: async (sessionId: string, data: CancelSessionData): Promise<TutoringSession> => {
    const response = await apiClient.patch<{ message: string; session: TutoringSession }>(
      `/sessions/${sessionId}/cancel`,
      data,
    );
    return response.data.session;
  },

  // Repositorio de evidencias (HU-25): PDF o imagen que respalda la sesión.
  listEvidence: async (sessionId: string): Promise<SessionEvidence[]> => {
    const response = await apiClient.get<{ evidences: SessionEvidence[] }>(
      `/sessions/${sessionId}/evidence`,
    );
    return response.data.evidences;
  },

  uploadEvidence: async (sessionId: string, file: File): Promise<SessionEvidence> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ message: string; evidence: SessionEvidence }>(
      `/sessions/${sessionId}/evidence`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.evidence;
  },

  downloadEvidence: async (sessionId: string, evidence: SessionEvidence): Promise<void> => {
    const response = await apiClient.get(`/sessions/${sessionId}/evidence/${evidence.id}/file`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, evidence.fileName);
  },
};
