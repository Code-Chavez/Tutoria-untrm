import { Request, Response } from 'express';
import { z } from 'zod';
import { ListRolesUseCase } from '@application/use-cases/roles/ListRolesUseCase';
import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@application/use-cases/roles/UpdateRoleUseCase';
import { SetRoleActiveUseCase } from '@application/use-cases/roles/SetRoleActiveUseCase';
import {
  PermissionNotGrantableError,
  RoleAlreadyExistsError,
  RoleInUseError,
  RoleNotFoundError,
  RoleProtectedError,
  UnknownPermissionError,
} from '@application/use-cases/roles/RoleErrors';
import { createRoleSchema, setRoleActiveSchema, updateRoleSchema } from '../validators/role.validators';
import { PERMISSION_CATALOG } from '@domain/permissionCatalog';

export class RoleController {
  listPermissions = (_req: Request, res: Response) => {
    res.status(200).json({ permissions: PERMISSION_CATALOG });
  };

  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly setRoleActiveUseCase: SetRoleActiveUseCase,
  ) {}

  private fail(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Datos de entrada inválidos', details: error.issues });
    } else if (error instanceof UnknownPermissionError) {
      res.status(400).json({ error: error.message, code: 'UNKNOWN_PERMISSION' });
    } else if (error instanceof PermissionNotGrantableError) {
      res.status(403).json({ error: error.message, code: 'PERMISSION_NOT_GRANTABLE' });
    } else if (error instanceof RoleNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof RoleAlreadyExistsError || error instanceof RoleProtectedError || error instanceof RoleInUseError) {
      const code = error instanceof RoleProtectedError ? 'ROLE_PROTECTED' : error instanceof RoleInUseError ? 'ROLE_IN_USE' : 'ROLE_EXISTS';
      res.status(409).json({ error: error.message, code });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

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
      const role = await this.createRoleUseCase.execute(data, req.auth?.sub as string, req.ip, req.permissions ?? []);
      res.status(201).json({ message: 'Rol creado exitosamente', role });
    } catch (error) {
      this.fail(error, res);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const data = updateRoleSchema.parse(req.body);
      const role = await this.updateRoleUseCase.execute(req.params.id as string, data, req.auth?.sub as string, req.ip ?? null, req.permissions ?? []);
      res.status(200).json({ message: 'Rol actualizado', role });
    } catch (error) {
      this.fail(error, res);
    }
  };

  setActive = async (req: Request, res: Response) => {
    try {
      const { isActive } = setRoleActiveSchema.parse(req.body);
      const role = await this.setRoleActiveUseCase.execute(req.params.id as string, isActive, req.auth?.sub as string, req.ip ?? null);
      res.status(200).json({ message: isActive ? 'Rol activado' : 'Rol desactivado', role });
    } catch (error) {
      this.fail(error, res);
    }
  };
}
