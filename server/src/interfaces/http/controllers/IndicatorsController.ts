import { Request, Response } from 'express';
import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { IndicatorsForbiddenError } from '@application/use-cases/indicators/IndicatorsErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';

const param = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export class IndicatorsController {
  constructor(private readonly getIndicatorsUseCase: GetIndicatorsUseCase) {}

  // Tablero de indicadores (HU-45), filtrable por facultad, escuela y tutor.
  get = async (req: Request, res: Response) => {
    try {
      const report = await this.getIndicatorsUseCase.execute(req.auth?.sub as string, {
        facultyId: param(req.query.facultyId),
        schoolId: param(req.query.schoolId),
        tutorId: param(req.query.tutorId),
      });
      res.status(200).json({ report });
    } catch (error) {
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
