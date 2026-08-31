import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { RoleNotFoundError, RoleTargetUserNotFoundError } from './RoleErrors';

/**
 * Asigna un rol a un usuario. El modelo es de un rol por usuario (la relación
 * many-to-many es rol↔permiso), por lo que "asignar" reemplaza el rol vigente.
 */
export class AssignRoleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(userId: string, roleId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new RoleTargetUserNotFoundError(userId);
    }

    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    const updated = await this.users.update(userId, { roleId });

    await this.auditLogs.create({
      userId,
      action: 'ASSIGN_ROLE',
      entity: 'User',
      entityId: userId,
      details: `role=${role.name}`,
      ipAddress: null,
    });

    const { passwordHash: _password, ...safeUser } = updated;
    return safeUser;
  }
}
