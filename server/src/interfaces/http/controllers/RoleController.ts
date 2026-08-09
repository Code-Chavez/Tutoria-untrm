import { Request, Response } from 'express';
import { ListRolesUseCase } from '@application/use-cases/roles/ListRolesUseCase';

export class RoleController {
  constructor(private readonly listRolesUseCase: ListRolesUseCase) {}

  list = async (req: Request, res: Response) => {
    try {
      const roles = await this.listRolesUseCase.execute();
      res.status(200).json({ roles });
    } catch (error) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
