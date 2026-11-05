import axios from 'axios';
import { apiClient } from '@shared/services/apiClient';

/**
 * Estado del ENVÍO (no de la recepción ni de la carga de la lista): PENDIENTE = enviándose; ENVIADO = aceptado por el servidor de
 * correo; FALLIDO = se demostró que no fue aceptado; INCIERTO = no se puede saber si el correo salió.
 */
export type DataRequestStatus = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'INCIERTO';
/** Qué lista se pide: la de estudiantes o la de docentes tutores (esta solo la DBU). */
export type DataRequestKind = 'ESTUDIANTES' | 'DOCENTES';

export interface DataRequest {
  id: string;
  createdAt: string;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  kind: DataRequestKind;
  toEmail: string;
  cycles: number[];
  note: string | null;
  status: DataRequestStatus;
  error: string | null;
  receivedAt: string | null;
}

export interface SendDataRequestInput {
  schoolId: string;
  cycles: number[];
  note?: string;
  kind?: DataRequestKind;
  /** Identifica la intención: repetirla (p. ej. por perder la respuesta) no envía otro correo. */
  operationId: string;
  /** Pedido equivalente anterior que la persona vio y confirma reenviar. */
  confirmDuplicateOf?: string;
}

/** Pedido anterior que el servidor muestra al advertir una equivalencia. */
export interface PreviousRequest {
  id: string;
  createdAt: string;
  status: DataRequestStatus;
}

export type SendConflict =
  | { code: 'DUPLICATE_DATA_REQUEST'; previous: PreviousRequest }
  | { code: 'DATA_REQUEST_IN_FLIGHT'; previous: PreviousRequest }
  | { code: 'OPERATION_ID_CONFLICT' };

/** El conflicto (409 o 422) que devuelve el servidor al enviar, o null si el error es de otra clase. */
export function parseSendConflict(error: unknown): SendConflict | null {
  if (!axios.isAxiosError(error) || (error.response?.status !== 409 && error.response?.status !== 422)) return null;
  const data = error.response.data as { code?: string; previous?: PreviousRequest } | undefined;
  if ((data?.code === 'DUPLICATE_DATA_REQUEST' || data?.code === 'DATA_REQUEST_IN_FLIGHT') && data.previous) return { code: data.code, previous: data.previous };
  if (data?.code === 'OPERATION_ID_CONFLICT') return { code: 'OPERATION_ID_CONFLICT' };
  return null;
}

/** Sin respuesta del servidor (red, tiempo agotado) o error 5xx: no se sabe si la operación se registró; hay que conservar su identificador. */
export function isLostResponse(error: unknown): boolean {
  return !axios.isAxiosError(error) || !error.response || error.response.status >= 500;
}

export const dataRequestService = {
  async list(): Promise<DataRequest[]> {
    return (await apiClient.get<{ requests: DataRequest[] }>('/data-requests')).data.requests;
  },
  /**
   * 201 enviado; 200 repetición de una operación ya registrada (no se envió otro correo); 202 registrado con resultado incierto;
   * 502 registrado pero el correo no fue aceptado. Las advertencias de equivalencia llegan como 409 (ver `parseSendConflict`).
   */
  async send(input: SendDataRequestInput): Promise<{ request: DataRequest; replayed: boolean }> {
    const response = await apiClient.post<{ request: DataRequest; replayed?: boolean }>('/data-requests', input, { validateStatus: (s) => s === 200 || s === 201 || s === 202 || s === 502 });
    return { request: response.data.request, replayed: response.data.replayed === true };
  },
  async markReceived(id: string): Promise<void> {
    await apiClient.post(`/data-requests/${id}/received`);
  },
  async setRequestEmail(schoolId: string, email: string | null): Promise<string | null> {
    return (await apiClient.put<{ requestEmail: string | null }>(`/schools/${schoolId}/request-email`, { email })).data.requestEmail;
  },
};
