import { PrismaClient } from '@prisma/client';
import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { UserAccessAuditContext, UserAccessPolicyRepository } from '@domain/repositories/UserAccessPolicyRepository';

export class PrismaUserAccessPolicyRepository implements UserAccessPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<UserAccessPolicy | null> {
    const policy = await this.prisma.userAccessPolicy.findUnique({ where: { userId } });
    if (!policy) return null;
    // Un valor desconocido no se convierte en acceso total ni en la política heredada.
    const kinds: readonly string[] = ['NONE', 'OWN', 'SCHOOLS', 'FACULTIES', 'INSTITUTION', 'SERVICE'];
    return { ...policy, kind: kinds.includes(policy.kind) ? policy.kind as UserAccessPolicy['kind'] : 'NONE' };
  }

  async save(
    policy: Pick<UserAccessPolicy, 'userId' | 'roleId' | 'kind' | 'schoolIds' | 'facultyIds' | 'service'>,
    audit: UserAccessAuditContext,
    roleName: string,
  ): Promise<UserAccessPolicy> {
    const { userId, ...fields } = policy;
    const saved = await this.prisma.$transaction(async (tx) => {
      const before = await tx.userAccessPolicy.findUnique({ where: { userId } });
      // La revisión sube en cada cambio: permite detectar que un alcance se modificó mientras se editaba.
      const row = await tx.userAccessPolicy.upsert({
        where: { userId },
        create: { userId, ...fields },
        update: { ...fields, revision: { increment: 1 } },
      });
      const detail = (p: { kind: string; schoolIds: string[]; facultyIds: string[]; service: string | null }) =>
        `${p.kind}${p.schoolIds.length ? ` escuelas=${p.schoolIds.length}` : ''}${p.facultyIds.length ? ` facultades=${p.facultyIds.length}` : ''}${p.service ? ` servicio=${p.service}` : ''}`;
      await tx.auditLog.create({
        data: {
          userId: audit.userId,
          action: 'USER_ACCESS_UPDATED',
          entity: 'User',
          entityId: userId,
          details: `Rol «${roleName}»; alcance ${before && before.roleId === row.roleId ? `${detail(before)} → ` : ''}${detail(row)}`.slice(0, 1000),
          ipAddress: audit.ipAddress,
        },
      });
      return row;
    });
    return { ...saved, kind: saved.kind as UserAccessPolicy['kind'] };
  }
}
