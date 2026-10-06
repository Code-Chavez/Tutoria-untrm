import { Request, Response } from 'express';
import { GetReportFilterOptionsUseCase } from '@application/use-cases/report-filters/GetReportFilterOptionsUseCase';
import { ReportFiltersForbiddenError } from '@application/use-cases/report-filters/ReportFilterErrors';

export class ReportFilterController {
  constructor(private readonly getReportFilterOptionsUseCase: GetReportFilterOptionsUseCase) {}

  // Opciones de los controles de filtro de los reportes (HU-47), según el alcance del rol.
  options = async (req: Request, res: Response) => {
    try {
      const options = await this.getReportFilterOptionsUseCase.execute(req.auth?.sub as string);
      res.status(200).json({ options });
    } catch (error) {
      if (error instanceof ReportFiltersForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
