import { Request, Response } from 'express';
import { ListSchoolsUseCase } from '@application/use-cases/schools/ListSchoolsUseCase';

export class SchoolController {
  constructor(private readonly listSchoolsUseCase: ListSchoolsUseCase) {}

  list = async (_req: Request, res: Response) => {
    try {
      const schools = await this.listSchoolsUseCase.execute();
      res.status(200).json({ schools });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
