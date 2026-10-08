import { PrismaClient } from '@prisma/client';
import { AuditLog } from '@domain/entities/AuditLog';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { AuditLogPage, AuditLogQuery, AuditLogReader } from '@domain/repositories/AuditLogReader';

export class PrismaAuditLogRepository implements AuditLogRepository, AuditLogReader {
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

  async query(query: AuditLogQuery): Promise<AuditLogPage> {
    const actor = query.actor?.trim();
    const where = {
      ...((query.from || query.to) && {
        createdAt: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) },
      }),
      ...(query.entity && { entity: query.entity }),
      ...(query.action && { action: query.action }),
      ...(actor && {
        user: {
          OR: [
            { firstName: { contains: actor, mode: 'insensitive' as const } },
            { lastName: { contains: actor, mode: 'insensitive' as const } },
            { email: { contains: actor, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      total,
      items: rows.map(({ user, ...entry }) => ({
        ...entry,
        actorName: `${user.firstName} ${user.lastName}`,
        actorEmail: user.email,
      })),
    };
  }

  async distinctOptions(): Promise<{ entities: string[]; actions: string[] }> {
    const [entities, actions] = await Promise.all([
      this.prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, orderBy: { entity: 'asc' } }),
      this.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    ]);
    return { entities: entities.map((e) => e.entity), actions: actions.map((a) => a.action) };
  }
}
