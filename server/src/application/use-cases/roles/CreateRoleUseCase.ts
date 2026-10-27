import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { RoleAlreadyExistsError } from './RoleErrors';

export class CreateRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  /** Crea el rol y deja en la bitácora quién lo creó. Un nombre repetido o un fallo al crear no registran nada. */
  async execute(data: { name: string; description: string }, actingUserId: string, ipAddress?: string | null): Promise<Role> {
    const existing = await this.roles.findByName(data.name.trim());
    if (existing) {
      throw new RoleAlreadyExistsError(data.name);
    }
    const role = await this.roles.create({ name: data.name.trim(), description: data.description });
    await this.auditLogs.create({
      userId: actingUserId,
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: role.id,
      details: `Rol «${role.name}»`,
      ipAddress: ipAddress ?? null,
    });
    return role;
  }
}
