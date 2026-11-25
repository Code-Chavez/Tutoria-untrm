import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAdminRepository } from '@domain/repositories/RoleAdminRepository';
import { RoleNotFoundError, RoleProtectedError } from './RoleErrors';
import { isAdministratorRole, validateGrantablePermissions } from './rolePermissionPolicy';

export class UpdateRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly admin: RoleAdminRepository,
    /** Invalida las cachés de roles y permisos: el cambio rige desde la siguiente petición. */
    private readonly onChanged: () => void,
  ) {}

  /** Edita descripción y/o permisos de cualquier rol salvo el del Administrador (los demás roles base también se editan). El cambio y la bitácora (con lo añadido y lo quitado) van en una transacción. */
  async execute(
    id: string,
    data: { description?: string; permissions?: string[] },
    actingUserId: string,
    ipAddress: string | null,
    actorPermissions: string[],
  ): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) throw new RoleNotFoundError(id);
    if (isAdministratorRole(role)) throw new RoleProtectedError(role.name, 'edit');
    const permissionCodes = data.permissions === undefined ? undefined : validateGrantablePermissions(data.permissions, actorPermissions);
    const result = await this.admin.update(id, { description: data.description?.trim(), permissionCodes }, { userId: actingUserId, ipAddress });
    this.onChanged();
    return result.role;
  }
}
