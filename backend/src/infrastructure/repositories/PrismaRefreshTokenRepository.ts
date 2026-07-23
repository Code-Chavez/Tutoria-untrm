import { PrismaClient } from '@prisma/client';
import { RefreshToken } from '@domain/entities/RefreshToken';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
