import { Request, Response } from 'express';
import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { IndicatorsForbiddenError } from '@application/use-cases/indicators/IndicatorsErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { handleReportFilterError, parseReportFilters } from '../reportFilters';

export class IndicatorsController {
  constructor(private readonly getIndicatorsUseCase: GetIndicatorsUseCase) {}

  // Tablero de indicadores (HU-45), con los filtros combinados de HU-47.
  get = async (req: Request, res: Response) => {
    try {
      const report = await this.getIndicatorsUseCase.execute(
        req.auth?.sub as string,
        parseReportFilters(req.query),
      );
      res.status(200).json({ report });
    } catch (error) {
      if (handleReportFilterError(error, res)) return;
      if (error instanceof IndicatorsForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
