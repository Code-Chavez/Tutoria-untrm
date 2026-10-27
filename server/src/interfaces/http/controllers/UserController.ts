import { Request, Response } from 'express';
import { IssueInvitationUseCase } from '@application/use-cases/users/IssueInvitationUseCase';
import { CreateUserUseCase, DuplicateEmailError } from '@application/use-cases/users/CreateUserUseCase';
import { UpdateUserUseCase, UserNotFoundError } from '@application/use-cases/users/UpdateUserUseCase';
import { ToggleUserStatusUseCase } from '@application/use-cases/users/ToggleUserStatusUseCase';
import { ListUsersUseCase } from '@application/use-cases/users/ListUsersUseCase';
import { AssignRoleUseCase } from '@application/use-cases/roles/AssignRoleUseCase';
import { RoleNotFoundError, RoleTargetUserNotFoundError } from '@application/use-cases/roles/RoleErrors';
import { assignRoleSchema } from '../validators/role.validators';
import { ServiceRequiredError } from '@application/use-cases/users/serviceAssignment';
import { TutorSchoolRequiredError } from '@application/use-cases/users/tutorSchool';
import { DeanFacultyRequiredError } from '@application/use-cases/users/deanFaculty';
import { z } from 'zod';
import { optionalPhone, personName } from '../validators/fields';
import { EmailPolicy, emailField } from '@application/validation/email';
import { InvalidAccountEmailError, LastActiveAdministratorError } from '@application/use-cases/users/UserErrors';

const createUserSchema = z.object({
  // Forma y tamaño aquí; el dominio permitido (RF-01) lo decide el caso de uso con la política del despliegue.
  email: emailField(),
  firstName: personName('El nombre'),
  lastName: personName('El apellido'),
  roleId: z.string().uuid('El ID de rol debe ser un UUID válido'),
  phone: optionalPhone(),
  photoUrl: z.string().url('URL inválida').optional(),
  // Solo para el rol Profesional de Servicio: decide qué casos derivados ve y recibe.
  // Solo para el rol Docente Tutor: su escuela profesional (de ella salen su facultad y su sede).
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').nullable().optional(),
  // Solo para el rol Decano: su facultad.
  facultyId: z.string().uuid('La facultad debe ser un UUID válido').nullable().optional(),
  service: z.enum(['ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']).nullable().optional(),
});

const updateUserSchema = createUserSchema.partial();

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly toggleUserStatusUseCase: ToggleUserStatusUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly issueInvitationUseCase: IssueInvitationUseCase,
    private readonly emailPolicy: EmailPolicy,
  ) {}

  // Los formularios muestran y validan el dominio permitido con la misma política que aplica el servidor.
  getEmailPolicy = (_req: Request, res: Response) => {
    res.status(200).json({ allowedDomains: this.emailPolicy.allowedDomains });
  };

  assignRole = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { roleId, service, schoolId, facultyId } = assignRoleSchema.parse(req.body);
      const user = await this.assignRoleUseCase.execute(id, roleId, service, schoolId, facultyId);
      res.status(200).json({ message: 'Rol asignado exitosamente', user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
      } else if (
        error instanceof RoleTargetUserNotFoundError ||
        error instanceof RoleNotFoundError
      ) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ServiceRequiredError || error instanceof TutorSchoolRequiredError || error instanceof DeanFacultyRequiredError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof LastActiveAdministratorError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await this.createUserUseCase.execute(data);
      // La cuenta nace pendiente de activación: la invitación (correo + enlace para quien administra) es la única forma de entrar.
      const invitation = await this.issueInvitationUseCase.execute(req.auth?.sub as string, user.id, req.ip);
      res.status(201).json({ message: 'Usuario creado exitosamente', user, invitation });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
      } else if (error instanceof DuplicateEmailError || error instanceof InvalidAccountEmailError || error instanceof ServiceRequiredError || error instanceof TutorSchoolRequiredError || error instanceof DeanFacultyRequiredError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof RoleNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  /** Reemite la invitación (enlace nuevo de un solo uso); invalida la anterior. */
  reissueInvitation = async (req: Request, res: Response) => {
    try {
      const invitation = await this.issueInvitationUseCase.execute(req.auth?.sub as string, req.params.id as string, req.ip);
      res.status(200).json({ message: 'Invitación emitida', invitation });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({ error: error.message });
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
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
      } else if (error instanceof UserNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof DuplicateEmailError || error instanceof InvalidAccountEmailError || error instanceof ServiceRequiredError || error instanceof TutorSchoolRequiredError || error instanceof DeanFacultyRequiredError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof RoleNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof LastActiveAdministratorError) {
        res.status(409).json({ error: error.message });
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
      } else if (error instanceof LastActiveAdministratorError) {
        res.status(409).json({ error: error.message });
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
