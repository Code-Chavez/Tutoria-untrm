import { PrismaClient } from '@prisma/client';
import { AuditLog } from '@domain/entities/AuditLog';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  findAll(filters?: { userId?: string; entity?: string }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.entity && { entity: filters.entity }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
