import { PrismaClient } from '@prisma/client';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken';
import { PasswordResetTokenRepository } from '../../domain/repositories/PasswordResetTokenRepository';

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<PasswordResetToken, 'id' | 'createdAt'>): Promise<PasswordResetToken> {
    const created = await this.prisma.passwordResetToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        used: data.used,
      },
    });

    return {
      id: created.id,
      token: created.token,
      userId: created.userId,
      expiresAt: created.expiresAt,
      used: created.used,
      createdAt: created.createdAt,
    };
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return {
      id: record.id,
      token: record.token,
      userId: record.userId,
      expiresAt: record.expiresAt,
      used: record.used,
      createdAt: record.createdAt,
    };
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}
