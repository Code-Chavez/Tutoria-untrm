import { PrismaClient } from '@prisma/client';
import { UserAccessPolicy } from '@domain/entities/UserAccessPolicy';
import { UserAccessPolicyRepository } from '@domain/repositories/UserAccessPolicyRepository';

export class PrismaUserAccessPolicyRepository implements UserAccessPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<UserAccessPolicy | null> {
    const policy = await this.prisma.userAccessPolicy.findUnique({ where: { userId } });
    if (!policy) return null;
    // Un valor desconocido no se convierte en acceso total ni en la política heredada.
    const kinds: readonly string[] = ['NONE', 'OWN', 'SCHOOLS', 'FACULTIES', 'INSTITUTION', 'SERVICE'];
    return { ...policy, kind: kinds.includes(policy.kind) ? policy.kind as UserAccessPolicy['kind'] : 'NONE' };
  }
}
