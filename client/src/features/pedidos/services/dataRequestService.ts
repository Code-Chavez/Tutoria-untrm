import { apiClient } from '@shared/services/apiClient';

export type DataRequestStatus = 'ENVIADO' | 'FALLIDO';

export interface DataRequest {
  id: string;
  createdAt: string;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  toEmail: string;
  cycles: number[];
  note: string | null;
  status: DataRequestStatus;
  error: string | null;
  receivedAt: string | null;
}

export const dataRequestService = {
  async list(): Promise<DataRequest[]> {
    return (await apiClient.get<{ requests: DataRequest[] }>('/data-requests')).data.requests;
  },
  /** El servidor responde 502 con el pedido registrado como FALLIDO si el correo no sale; se tratan igual. */
  async send(input: { schoolId: string; cycles: number[]; note?: string }): Promise<{ request: DataRequest; sent: boolean }> {
    const response = await apiClient.post<{ request: DataRequest }>('/data-requests', input, { validateStatus: (s) => s === 201 || s === 502 });
    return { request: response.data.request, sent: response.status === 201 };
  },
  async markReceived(id: string): Promise<void> {
    await apiClient.post(`/data-requests/${id}/received`);
  },
  async setRequestEmail(schoolId: string, email: string | null): Promise<string | null> {
    return (await apiClient.put<{ requestEmail: string | null }>(`/schools/${schoolId}/request-email`, { email })).data.requestEmail;
  },
};
