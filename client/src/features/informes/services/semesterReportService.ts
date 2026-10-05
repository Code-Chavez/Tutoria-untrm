import { apiClient } from '@shared/services/apiClient';

// Informe de implementación de la tutoría semestral (HU-43, Anexo N°9).
export interface SemesterReportRow {
  activity: string;
  achievements: string;
  difficulties: string;
  suggestions: string;
  participants: number;
}

export interface SemesterReportContent {
  programName: string;
  faculty: string;
  teacherCategory: string;
  tutoringCycles: string;
  phone: string;
  individual: SemesterReportRow[];
  group: SemesterReportRow[];
}

export interface SemesterReport extends SemesterReportContent {
  id: string;
  periodId: string;
  tutorId: string;
  updatedAt: string;
}

export interface MySemesterReportView {
  periodName: string;
  tutorName: string;
  /** Informe ya guardado, o null si aún no se guardó. */
  report: SemesterReport | null;
  /** Borrador autollenado con las sesiones y seguimientos del periodo. */
  draft: SemesterReportContent;
}

export const semesterReportService = {
  async getMine(): Promise<MySemesterReportView> {
    const response = await apiClient.get<MySemesterReportView>('/semester-reports/me');
    return response.data;
  },

  async saveMine(content: SemesterReportContent): Promise<SemesterReport> {
    const response = await apiClient.put<{ message: string; report: SemesterReport }>(
      '/semester-reports/me',
      content,
    );
    return response.data.report;
  },

  async downloadPdf(): Promise<void> {
    const response = await apiClient.get('/semester-reports/me/pdf', { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'informe-tutoria-semestral.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
