import { PrismaClient } from '@prisma/client';
import { Role } from '@domain/entities/Role';
import { RoleCreationAudit, RoleRepository } from '@domain/repositories/RoleRepository';

const withPermissions = {
  permissions: { include: { permission: true } },
} as const;

type PrismaRoleWithPermissions = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  permissions: { permission: { id: string; code: string; description: string } }[];
};

function toDomain(role: PrismaRoleWithPermissions): Role {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    createdAt: role.createdAt,
    permissions: role.permissions.map((rp) => rp.permission),
  };
}

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: withPermissions,
    });
    return role ? toDomain(role) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: withPermissions,
    });
    return role ? toDomain(role) : null;
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({ include: withPermissions });
    return roles.map(toDomain);
  }

  async create(data: { name: string; description: string }, audit?: RoleCreationAudit): Promise<Role> {
    if (!audit) {
      const role = await this.prisma.role.create({ data, include: withPermissions });
      return toDomain(role);
    }
    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({ data, include: withPermissions });
      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          action: 'ROLE_CREATED',
          entity: 'Role',
          entityId: created.id,
          details: `Rol «${created.name}»`,
          ipAddress: audit.ipAddress,
        },
      });
      return created;
    });
    return toDomain(role);
  }
}
