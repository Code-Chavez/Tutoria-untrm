import { apiClient } from '@shared/services/apiClient';
import { ReportFilterParams } from '@shared/reportFilters/reportFilterService';

// Informe consolidado por escuela y facultad (HU-44).
export interface ConsolidatedMetrics {
  activeStudents: number;
  studentsWithTutor: number;
  coveragePct: number;
  tutors: number;
  sessionsIndividual: number;
  sessionsGroup: number;
  sessionsTotal: number;
  participants: number;
  participationPct: number;
  reportsSubmitted: number;
  reportsPct: number;
  avgStudentsPerTutor: number;
  avgSessionsPerTutor: number;
}

export interface ConsolidatedSchoolRow {
  schoolId: string;
  schoolName: string;
  metrics: ConsolidatedMetrics;
}

export interface ConsolidatedFacultyRow {
  facultyId: string;
  facultyName: string;
  metrics: ConsolidatedMetrics;
  schools: ConsolidatedSchoolRow[];
}

export interface ConsolidatedReport {
  periodName: string;
  generatedAt: string;
  totals: ConsolidatedMetrics;
  faculties: ConsolidatedFacultyRow[];
  /** Filtros aplicados (HU-47), p. ej. "Ciclo: 3". */
  appliedFilters: string[];
}

export type ConsolidatedFilters = ReportFilterParams;

const query = (filters: ConsolidatedFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};

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

export const consolidatedReportService = {
  async getReport(filters: ConsolidatedFilters): Promise<ConsolidatedReport> {
    const response = await apiClient.get<{ report: ConsolidatedReport }>(
      `/consolidated-reports?${query(filters)}`,
    );
    return response.data.report;
  },

  async download(format: 'excel' | 'pdf', filters: ConsolidatedFilters): Promise<void> {
    const response = await apiClient.get(`/consolidated-reports/${format}?${query(filters)}`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, `consolidado-tutoria.${format === 'excel' ? 'xlsx' : 'pdf'}`);
  },
};
