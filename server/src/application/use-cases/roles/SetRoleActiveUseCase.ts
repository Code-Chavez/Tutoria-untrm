import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAdminRepository } from '@domain/repositories/RoleAdminRepository';
import { RoleInUseError, RoleNotFoundError, RoleProtectedError } from './RoleErrors';

export class SetRoleActiveUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly admin: RoleAdminRepository,
    private readonly onChanged: () => void,
  ) {}

  /** Activa o desactiva un rol NO base. Desactivar exige que ninguna cuenta lo tenga (no se deja a nadie sin permisos por sorpresa). */
  async execute(id: string, isActive: boolean, actingUserId: string, ipAddress: string | null): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) throw new RoleNotFoundError(id);
    if (role.isBase) throw new RoleProtectedError(role.name);
    if (!isActive) {
      const users = await this.admin.countUsers(id);
      if (users > 0) throw new RoleInUseError(role.name, users);
    }
    const updated = await this.admin.setActive(id, isActive, { userId: actingUserId, ipAddress });
    this.onChanged();
    return updated;
  }
}
