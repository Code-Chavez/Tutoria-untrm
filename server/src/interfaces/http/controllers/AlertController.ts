import { Request, Response } from 'express';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';

export class AlertController {
  constructor(private readonly getRiskAlertsUseCase: GetRiskAlertsUseCase) {}

  // Alertas de inasistencia y riesgo (HU-26), siempre acotadas al alcance de quien las pide:
  // el tutor ve las de sus tutorados; el coordinador, las de sus escuelas; la DBU, todas.
  list = async (req: Request, res: Response) => {
    try {
      const alerts = await this.getRiskAlertsUseCase.executeFor(req.auth?.sub as string);
      res.status(200).json({ alerts });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
