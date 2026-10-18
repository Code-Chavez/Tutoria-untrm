import { apiClient } from '@shared/services/apiClient';

export type TutoringRequestSource = 'STUDENT' | 'INSTRUCTOR';
export type TutoringCaseType = 'ACADEMIC' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'HEALTH';

// Atención de la solicitud (R01): solo avanza.
export type TutoringRequestStatus = 'PENDIENTE' | 'EN_ATENCION' | 'ATENDIDA';

export const REQUEST_STATUS_LABEL: Record<TutoringRequestStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_ATENCION: 'En atención',
  ATENDIDA: 'Atendida',
};

export const CASE_TYPE_LABEL: Record<TutoringCaseType, string> = {
  ACADEMIC: 'Académico',
  PSYCHOLOGICAL: 'Psicológico',
  SOCIAL: 'Social',
  HEALTH: 'Salud',
};

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
  status: TutoringRequestStatus;
  responseNote: string | null;
  handledById: string | null;
  handledAt: string | null;
  /** Sesión programada o derivación hecha desde esta solicitud (una u otra, no ambas). */
  sessionId: string | null;
  referralId: string | null;
  createdAt: string;
}

// Solicitud con los nombres ya resueltos.
export interface TutoringRequestView extends TutoringRequest {
  studentName: string;
  studentCode: string;
  routedToName: string;
  handledByName: string | null;
}

/** Quién recibirá la solicitud del propio estudiante: su tutor, la coordinación de su escuela o, de respaldo, la DBU. */
export interface OwnRequestRecipient {
  kind: 'tutor' | 'coordinator' | 'dbu';
  name: string;
}

export interface UpdateRequestStatusData {
  status: 'EN_ATENCION' | 'ATENDIDA';
  note?: string;
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

  // Bandeja del personal: las enrutadas a la persona o las de sus tutorados (la DBU ve todas).
  getInbox: async (status?: TutoringRequestStatus): Promise<TutoringRequestView[]> => {
    const response = await apiClient.get<{ requests: TutoringRequestView[] }>('/tutoring-requests', {
      params: status ? { status } : undefined,
    });
    return response.data.requests;
  },

  // A quién llegará mi solicitud (con la misma regla con la que se enruta), para decirlo antes de enviarla.
  getRecipient: async (): Promise<OwnRequestRecipient | null> => {
    const response = await apiClient.get<{ recipient: OwnRequestRecipient | null }>('/tutoring-requests/recipient');
    return response.data.recipient;
  },

  // Historial propio del tutorado, con el estado y la respuesta recibida.
  getOwn: async (): Promise<TutoringRequestView[]> => {
    const response = await apiClient.get<{ requests: TutoringRequestView[] }>('/tutoring-requests/mine');
    return response.data.requests;
  },

  updateStatus: async (id: string, data: UpdateRequestStatusData): Promise<TutoringRequestView> => {
    const response = await apiClient.patch<{ request: TutoringRequestView }>(`/tutoring-requests/${id}/status`, data);
    return response.data.request;
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
