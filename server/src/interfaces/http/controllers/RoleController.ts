import { Request, Response } from 'express';
import { z } from 'zod';
import { ListRolesUseCase } from '@application/use-cases/roles/ListRolesUseCase';
import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { RoleAlreadyExistsError } from '@application/use-cases/roles/RoleErrors';
import { createRoleSchema } from '../validators/role.validators';

export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    try {
      const roles = await this.listRolesUseCase.execute();
      res.status(200).json({ roles });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = createRoleSchema.parse(req.body);
      const role = await this.createRoleUseCase.execute(data);
      res.status(201).json({ message: 'Rol creado exitosamente', role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof RoleAlreadyExistsError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
