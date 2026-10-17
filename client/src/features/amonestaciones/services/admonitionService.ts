import { apiClient } from '@shared/services/apiClient';

export interface Admonition {
  id: string;
  tutorId: string;
  tutorName: string;
  schoolName: string;
  issuedOn: string;
  reason: string;
  issuedByName: string;
  hasFile: boolean;
  fileName: string | null;
}

export interface AdmonishableTutor {
  tutorId: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
}

export const admonitionService = {
  list: async (): Promise<Admonition[]> => (await apiClient.get<{ admonitions: Admonition[] }>('/admonitions')).data.admonitions,
  tutors: async (): Promise<AdmonishableTutor[]> => (await apiClient.get<{ tutors: AdmonishableTutor[] }>('/admonitions/tutors')).data.tutors,
  issue: async (input: { tutorId: string; issuedOn: string; reason: string; file?: File | null }): Promise<void> => {
    const form = new FormData();
    form.append('tutorId', input.tutorId);
    form.append('issuedOn', input.issuedOn);
    form.append('reason', input.reason);
    if (input.file) form.append('file', input.file);
    await apiClient.post('/admonitions', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadFile: async (id: string, fileName: string): Promise<void> => {
    const response = await apiClient.get(`/admonitions/${id}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
