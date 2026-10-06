import { Request, Response } from 'express';
import { GetHomePanelUseCase } from '@application/use-cases/home-panel/GetHomePanelUseCase';

export class HomePanelController {
  constructor(private readonly getHomePanelUseCase: GetHomePanelUseCase) {}

  // Panel de inicio según el rol del usuario autenticado (HU-49).
  get = async (req: Request, res: Response) => {
    try {
      res.status(200).json({ panel: await this.getHomePanelUseCase.execute(req.auth?.sub as string) });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
