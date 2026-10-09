import { Response } from 'express';
import { z } from 'zod';
import { ReportFilters } from '@application/use-cases/report-filters/reportFilters';
import { ReportPeriodNotFoundError } from '@application/use-cases/report-filters/ReportFilterErrors';
import { reportFiltersQuerySchema } from './validators/reportFilters.validators';

/** Filtros combinados de reportes (HU-47) desde la query string; lanza ZodError si son inválidos. */
export function parseReportFilters(query: unknown): ReportFilters {
  return reportFiltersQuerySchema.parse(query);
}

/** Responde 400/404 para los errores propios de los filtros; devuelve true si ya respondió. */
export function handleReportFilterError(error: unknown, res: Response): boolean {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Filtros inválidos', details: error.errors });
    return true;
  }
  if (error instanceof ReportPeriodNotFoundError) {
    res.status(404).json({ error: error.message });
    return true;
  }
  return false;
}
