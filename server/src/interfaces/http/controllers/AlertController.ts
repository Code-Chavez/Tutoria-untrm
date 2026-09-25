import { Request, Response } from 'express';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';

export class AlertController {
  constructor(private readonly getRiskAlertsUseCase: GetRiskAlertsUseCase) {}

  // Alertas de inasistencia y riesgo (HU-26). ?mine=true limita a los
  // tutorados del tutor autenticado; sin el parámetro, ve todos (coordinador).
  list = async (req: Request, res: Response) => {
    try {
      const tutorId = req.query.mine === 'true' ? (req.auth?.sub as string) : undefined;
      const alerts = await this.getRiskAlertsUseCase.execute({ tutorId });
      res.status(200).json({ alerts });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
