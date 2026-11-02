import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAdminRepository } from '@domain/repositories/RoleAdminRepository';
import { RoleAlreadyExistsError, RoleNotFoundError } from './RoleErrors';
import { validateGrantablePermissions } from './rolePermissionPolicy';

export interface CreateRoleInput {
  name: string;
  description: string;
  /** Códigos del catálogo. */
  permissions?: string[];
  /** Copia los permisos de un rol existente (plantilla); se suma a `permissions`. */
  copyFromRoleId?: string;
}

export class CreateRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly admin?: RoleAdminRepository,
    private readonly onChanged: () => void = () => undefined,
  ) {}

  /**
   * Crea el rol y deja en la bitácora quién lo creó, en una sola transacción del repositorio: si falla la bitácora no queda el
   * rol, y si falla la creación (p. ej. un nombre repetido) no queda ningún registro. Con permisos o plantilla, se validan contra el
   * catálogo y contra lo que puede otorgar quien lo crea.
   */
  async execute(data: CreateRoleInput, actingUserId: string, ipAddress?: string | null, actorPermissions: string[] = []): Promise<Role> {
    const name = data.name.trim();
    if (await this.roles.findByName(name)) {
      throw new RoleAlreadyExistsError(data.name);
    }
    const audit = { userId: actingUserId, ipAddress: ipAddress ?? null };
    const withPermissions = (data.permissions?.length ?? 0) > 0 || data.copyFromRoleId;
    if (!withPermissions || !this.admin) {
      return this.roles.create({ name, description: data.description }, audit);
    }
    let codes = data.permissions ?? [];
    if (data.copyFromRoleId) {
      const template = await this.roles.findById(data.copyFromRoleId);
      if (!template) throw new RoleNotFoundError(data.copyFromRoleId);
      codes = [...codes, ...template.permissions.map((p) => p.code)];
    }
    const permissionCodes = validateGrantablePermissions(codes, actorPermissions);
    const role = await this.admin.createWithPermissions({ name, description: data.description, permissionCodes }, audit);
    this.onChanged();
    return role;
  }
}
