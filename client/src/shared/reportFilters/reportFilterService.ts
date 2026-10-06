import { apiClient } from '@shared/services/apiClient';

// Filtros combinados de reportes (HU-47): semestre, facultad, escuela, ciclo y tutor.
export interface ReportFilterOptions {
  periods: { id: string; name: string; isActive: boolean }[];
  faculties: { id: string; name: string }[];
  schools: { id: string; name: string; facultyId: string }[];
  cycles: number[];
  tutors: { id: string; name: string }[];
}

/** Valores de los controles; '' significa "todos". */
export interface ReportFilterValues {
  periodId: string;
  facultyId: string;
  schoolId: string;
  cycle: string;
  tutorId: string;
}

/** Parámetros de consulta: solo los filtros realmente elegidos. */
export interface ReportFilterParams {
  periodId?: string;
  facultyId?: string;
  schoolId?: string;
  cycle?: string;
  tutorId?: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilterValues = {
  periodId: '',
  facultyId: '',
  schoolId: '',
  cycle: '',
  tutorId: '',
};

export function toFilterParams(values: ReportFilterValues): ReportFilterParams {
  return {
    periodId: values.periodId || undefined,
    facultyId: values.facultyId || undefined,
    schoolId: values.schoolId || undefined,
    cycle: values.cycle || undefined,
    tutorId: values.tutorId || undefined,
  };
}

export const reportFilterService = {
  async getOptions(): Promise<ReportFilterOptions> {
    const response = await apiClient.get<{ options: ReportFilterOptions }>('/report-filters');
    return response.data.options;
  },
};
