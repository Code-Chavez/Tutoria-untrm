import { PrismaClient } from '@prisma/client';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken';
import { PasswordResetTokenRepository } from '../../domain/repositories/PasswordResetTokenRepository';

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Pick<PasswordResetToken, 'tokenHash' | 'userId' | 'expiresAt'>): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({ data: { ...data, used: false } });
  }

  async invalidatePendingForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({ where: { userId, used: false }, data: { used: true } });
  }

  countCreatedSince(userId: string, since: Date): Promise<number> {
    return this.prisma.passwordResetToken.count({ where: { userId, createdAt: { gte: since } } });
  }

  redeem(tokenHash: string, newPasswordHash: string, now: Date): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      // Condicional: de dos canjes simultáneos del mismo enlace solo uno marca el token y gana.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { tokenHash, used: false, expiresAt: { gt: now } },
        data: { used: true },
      });
      if (count !== 1) return null;

      const record = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, used: false }, data: { used: true } });
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
      return record.userId;
    });
  }
}
