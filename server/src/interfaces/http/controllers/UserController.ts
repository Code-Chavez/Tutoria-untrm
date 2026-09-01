import { Request, Response } from 'express';
import { CreateUserUseCase, DuplicateEmailError } from '@application/use-cases/users/CreateUserUseCase';
import { UpdateUserUseCase, UserNotFoundError } from '@application/use-cases/users/UpdateUserUseCase';
import { ToggleUserStatusUseCase } from '@application/use-cases/users/ToggleUserStatusUseCase';
import { ListUsersUseCase } from '@application/use-cases/users/ListUsersUseCase';
import { AssignRoleUseCase } from '@application/use-cases/roles/AssignRoleUseCase';
import { RoleNotFoundError, RoleTargetUserNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { assignRoleSchema } from '../validators/role.validators';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Correo inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  roleId: z.string().uuid('El ID de rol debe ser un UUID válido'),
  phone: z.string().optional(),
  photoUrl: z.string().url('URL inválida').optional(),
});

const updateUserSchema = createUserSchema.partial();

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly toggleUserStatusUseCase: ToggleUserStatusUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase
  ) {}

  assignRole = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { roleId } = assignRoleSchema.parse(req.body);
      const user = await this.assignRoleUseCase.execute(id, roleId);
      res.status(200).json({ message: 'Rol asignado exitosamente', user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (
        error instanceof RoleTargetUserNotFoundError ||
        error instanceof RoleNotFoundError
      ) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await this.createUserUseCase.execute(data);
      res.status(201).json({ message: 'Usuario creado exitosamente', user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof DuplicateEmailError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const data = updateUserSchema.parse(req.body);
      const user = await this.updateUserUseCase.execute(id, data);
      res.status(200).json({ message: 'Usuario actualizado exitosamente', user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof UserNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof DuplicateEmailError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  toggleStatus = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const user = await this.toggleUserStatusUseCase.execute(id);
      res.status(200).json({ message: 'Estado del usuario actualizado exitosamente', user });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const { isActive, roleId } = req.query;
      const filters: { isActive?: boolean; roleId?: string } = {};
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (typeof roleId === 'string') {
        filters.roleId = roleId;
      }

      const users = await this.listUsersUseCase.execute(filters);
      res.status(200).json({ users });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
