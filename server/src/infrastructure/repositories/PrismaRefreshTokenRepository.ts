import { PrismaClient } from '@prisma/client';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Pick<RefreshToken, 'tokenHash' | 'userId' | 'expiresAt'>): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revoke(id: string): Promise<boolean> {
    // Condicional: de dos peticiones simultáneas con el mismo token solo una gana la rotación.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count === 1;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
