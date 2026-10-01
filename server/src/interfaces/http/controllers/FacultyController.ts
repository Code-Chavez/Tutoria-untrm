import { Request, Response } from 'express';
import { ListFacultiesUseCase } from '@application/use-cases/faculties/ListFacultiesUseCase';

export class FacultyController {
  constructor(private readonly listFacultiesUseCase: ListFacultiesUseCase) {}

  list = async (_req: Request, res: Response) => {
    try {
      const faculties = await this.listFacultiesUseCase.execute();
      res.status(200).json({ faculties });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
