import { apiClient } from '@shared/services/apiClient';
import { ReportFilterParams } from '@shared/reportFilters/reportFilterService';

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
  /** Filtros aplicados (HU-47), p. ej. "Ciclo: 3". */
  appliedFilters: string[];
}

export type IndicatorsFilters = ReportFilterParams;

export const indicatorsService = {
  async getIndicators(filters: IndicatorsFilters): Promise<IndicatorsReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const response = await apiClient.get<{ report: IndicatorsReport }>(`/indicators?${params}`);
    return response.data.report;
  },
};
