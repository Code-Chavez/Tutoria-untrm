import { PrismaClient } from '@prisma/client';
import { Notification, NotificationType } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';

function toNotification(row: unknown): Notification {
  const r = row as any;
  return {
    id: r.id,
    userId: r.userId,
    type: r.type as NotificationType,
    message: r.message,
    referralId: r.referralId,
    tutoringRequestId: r.tutoringRequestId ?? null,
    read: r.read,
    createdAt: r.createdAt,
  };
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    message: string;
    referralId?: string | null;
    tutoringRequestId?: string | null;
  }): Promise<Notification> {
    const row = await this.prisma.notification.create({ data });
    return toNotification(row);
  }

  async findByUser(userId: string, limit = 50): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toNotification);
  }

  async markAllRead(userId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return count;
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (count === 0) return null;
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  }
}
