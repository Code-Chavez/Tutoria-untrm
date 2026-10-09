import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { ReportPeriodNotFoundError } from './ReportFilterErrors';

/** Filtros combinados de los reportes (HU-47): todos opcionales y acumulables. */
export interface ReportFilters {
  /** Semestre; por defecto, el periodo activo. */
  periodId?: string;
  facultyId?: string;
  schoolId?: string;
  /** Ciclo del tutorado (1-12). */
  cycle?: number;
  tutorId?: string;
}

/** Semestre a reportar: el indicado o, si no se indica, el periodo activo. */
export async function resolveReportPeriod(
  periods: AcademicPeriodRepository,
  periodId?: string,
): Promise<AcademicPeriod> {
  if (periodId) {
    const period = await periods.findById(periodId);
    if (!period) throw new ReportPeriodNotFoundError();
    return period;
  }
  const active = await periods.findActive();
  if (!active) throw new NoActivePeriodError();
  return active;
}

/** Etiquetas legibles de los filtros aplicados, para rotular las exportaciones. */
export function appliedFilterLabels(
  filters: ReportFilters,
  names: { faculty?: string; school?: string; tutor?: string },
): string[] {
  return [
    names.faculty && `Facultad: ${names.faculty}`,
    names.school && `Escuela: ${names.school}`,
    filters.cycle !== undefined && `Ciclo: ${filters.cycle}`,
    names.tutor && `Tutor: ${names.tutor}`,
  ].filter((label): label is string => typeof label === 'string');
}
