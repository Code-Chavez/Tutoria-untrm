import { apiClient } from '@shared/services/apiClient';

export interface TeacherImportReport {
  totalRows: number;
  created: number;
  skipped: number;
  createdRows: { row: number; email: string; fullName: string; school: string; emailSent: boolean; invitationLink?: string }[];
  errors: { row: number; email?: string; message: string }[];
}

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

export const teacherImportService = {
  importTeachers: async (file: File): Promise<TeacherImportReport> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ report: TeacherImportReport }>('/tutors/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.report;
  },

  downloadTemplate: async (): Promise<void> => {
    const response = await apiClient.get('/tutors/import/template', { responseType: 'blob' });
    saveBlob(response.data as Blob, 'plantilla-docentes-tutores.xlsx');
  },
};
