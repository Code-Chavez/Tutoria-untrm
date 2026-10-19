import { Request, Response } from 'express';
import { GetInstitutionalPendingUseCase } from '@application/use-cases/pending/GetInstitutionalPendingUseCase';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

export class InstitutionalPendingController {
  constructor(private readonly getPending: GetInstitutionalPendingUseCase) {}

  index = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.getPending.execute(req.auth?.sub as string));
    } catch (error) {
      if (error instanceof StudentAccessDeniedError) res.status(403).json({ error: error.message });
      else res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
