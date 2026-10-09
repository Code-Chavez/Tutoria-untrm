import { apiClient } from '@shared/services/apiClient';

// Documentos impresos, firmados a mano y escaneados (A14): constancia de derivación (Anexo N°6) y hoja de
// asistencia a la tutoría individual (Anexo N°4). El sistema guarda el archivo, quién lo adjuntó y su huella.
export interface SignedDocument {
  id: string;
  kind: 'REFERRAL_CONSTANCIA' | 'ATTENDANCE_SHEET';
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  uploadedByName: string;
  createdAt: string;
}

export interface AttendanceSheetDocuments {
  period: { id: string; name: string };
  documents: SignedDocument[];
}

export const SIGNED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
export const SIGNED_MAX_BYTES = 10 * 1024 * 1024;

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

const form = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return data;
};

export const signedDocumentService = {
  async listForReferral(referralId: string): Promise<SignedDocument[]> {
    const response = await apiClient.get<{ documents: SignedDocument[] }>(`/referrals/${referralId}/signed-documents`);
    return response.data.documents;
  },

  async attachToReferral(referralId: string, file: File): Promise<SignedDocument> {
    const response = await apiClient.post<{ document: SignedDocument }>(`/referrals/${referralId}/signed-documents`, form(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.document;
  },

  async listForAttendanceSheet(studentId: string): Promise<AttendanceSheetDocuments> {
    const response = await apiClient.get<AttendanceSheetDocuments>(`/students/${studentId}/attendance-sheet/signed-documents`);
    return response.data;
  },

  async attachToAttendanceSheet(studentId: string, file: File): Promise<SignedDocument> {
    const response = await apiClient.post<{ document: SignedDocument }>(
      `/students/${studentId}/attendance-sheet/signed-documents`,
      form(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.document;
  },

  async download(document: SignedDocument): Promise<void> {
    const response = await apiClient.get(`/signed-documents/${document.id}/file`, { responseType: 'blob' });
    saveBlob(response.data as Blob, document.fileName);
  },
};
