import { apiClient } from '@shared/services/apiClient';

// Tablero de indicadores (HU-45), orientado a ICACIT/SINEACE.
export interface IndicatorsReport {
  periodName: string;
  generatedAt: string;
  students: { active: number; withTutor: number; withoutTutor: number; assignedPct: number };
  risk: {
    atRisk: number;
    atRiskPct: number;
    bySchool: { schoolId: string; schoolName: string; active: number; atRisk: number }[];
  };
  sessions: {
    individual: number;
    group: number;
    total: number;
    studentsServed: number;
    coveragePct: number;
    byMonth: { month: string; individual: number; group: number }[];
  };
  referrals: {
    total: number;
    byService: { service: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
  evaluation: { responses: number; averageScore: number | null };
  filterOptions: {
    faculties: { id: string; name: string }[];
    schools: { id: string; name: string; facultyId: string }[];
    tutors: { id: string; name: string }[];
  };
}

export interface IndicatorsFilters {
  facultyId?: string;
  schoolId?: string;
  tutorId?: string;
}

export const indicatorsService = {
  async getIndicators(filters: IndicatorsFilters): Promise<IndicatorsReport> {
    const params = new URLSearchParams();
    if (filters.facultyId) params.set('facultyId', filters.facultyId);
    if (filters.schoolId) params.set('schoolId', filters.schoolId);
    if (filters.tutorId) params.set('tutorId', filters.tutorId);
    const response = await apiClient.get<{ report: IndicatorsReport }>(`/indicators?${params}`);
    return response.data.report;
  },
};
