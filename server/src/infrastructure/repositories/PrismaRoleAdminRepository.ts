import { PrismaClient } from '@prisma/client';
import { Role } from '@domain/entities/Role';
import { RoleAdminRepository, RoleAuditContext } from '@domain/repositories/RoleAdminRepository';

const withPermissions = { permissions: { include: { permission: true } } } as const;

type Row = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  isBase: boolean;
  isActive: boolean;
  permissions: { permission: { id: string; code: string; description: string } }[];
};

const toDomain = (r: Row): Role => ({
  id: r.id,
  name: r.name,
  description: r.description,
  createdAt: r.createdAt,
  isBase: r.isBase,
  isActive: r.isActive,
  permissions: r.permissions.map((rp) => rp.permission),
});

export class PrismaRoleAdminRepository implements RoleAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createWithPermissions(data: { name: string; description: string; permissionCodes: string[] }, audit: RoleAuditContext): Promise<Role> {
    const row = await this.prisma.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({ where: { code: { in: data.permissionCodes } }, select: { id: true } });
      const created = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
        },
        include: withPermissions,
      });
      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          action: 'ROLE_CREATED',
          entity: 'Role',
          entityId: created.id,
          details: `Rol «${created.name}» con ${data.permissionCodes.length} permiso(s): ${data.permissionCodes.join(', ')}`.slice(0, 1000),
          ipAddress: audit.ipAddress,
        },
      });
      return created;
    });
    return toDomain(row);
  }

  async update(id: string, data: { description?: string; permissionCodes?: string[] }, audit: RoleAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.role.findUniqueOrThrow({ where: { id }, include: withPermissions });
      const beforeCodes = before.permissions.map((rp) => rp.permission.code);
      let added: string[] = [];
      let removed: string[] = [];
      if (data.permissionCodes) {
        const wanted = new Set(data.permissionCodes);
        added = data.permissionCodes.filter((c) => !beforeCodes.includes(c)).sort();
        removed = beforeCodes.filter((c) => !wanted.has(c)).sort();
        const permissions = await tx.permission.findMany({ where: { code: { in: data.permissionCodes } }, select: { id: true } });
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) });
      }
      const changedDescription = data.description !== undefined && data.description !== before.description;
      const row = await tx.role.update({
        where: { id },
        data: data.description !== undefined ? { description: data.description } : {},
        include: withPermissions,
      });
      const parts = [`Rol «${before.name}»`];
      if (added.length) parts.push(`añade: ${added.join(', ')}`);
      if (removed.length) parts.push(`quita: ${removed.join(', ')}`);
      if (changedDescription) parts.push('cambia la descripción');
      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          action: 'ROLE_UPDATED',
          entity: 'Role',
          entityId: id,
          details: parts.join('; ').slice(0, 1000),
          ipAddress: audit.ipAddress,
        },
      });
      return { role: toDomain(row), added, removed };
    });
  }

  async setActive(id: string, isActive: boolean, audit: RoleAuditContext): Promise<Role> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({ where: { id }, data: { isActive }, include: withPermissions });
      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          action: isActive ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED',
          entity: 'Role',
          entityId: id,
          details: `Rol «${updated.name}»`,
          ipAddress: audit.ipAddress,
        },
      });
      return updated;
    });
    return toDomain(row);
  }

  countUsers(roleId: string): Promise<number> {
    return this.prisma.user.count({ where: { roleId } });
  }
}
