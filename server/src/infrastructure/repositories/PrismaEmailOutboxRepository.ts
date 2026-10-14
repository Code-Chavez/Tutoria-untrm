import { PrismaClient } from '@prisma/client';
import { Notification, NotificationType } from '@domain/entities/Notification';
import { EmailOutboxRepository, OutboxItem } from '@domain/repositories/EmailOutboxRepository';

type Row = {
  id: string;
  attempts: number;
  notification: {
    id: string;
    userId: string;
    type: string;
    message: string;
    referralId: string | null;
    tutoringRequestId: string | null;
    read: boolean;
    createdAt: Date;
  };
};

const toItem = (row: Row): OutboxItem => ({
  id: row.id,
  attempts: row.attempts,
  notification: { ...row.notification, type: row.notification.type as NotificationType } as Notification,
});

export class PrismaEmailOutboxRepository implements EmailOutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue(notificationId: string): Promise<void> {
    // Idempotente: un aviso tiene una sola entrada aunque se intente encolar dos veces.
    await this.prisma.emailOutbox.upsert({ where: { notificationId }, update: {}, create: { notificationId } });
  }

  async claimDue(now: Date, limit: number, leaseMs: number): Promise<OutboxItem[]> {
    const candidates = await this.prisma.emailOutbox.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    const claimed: OutboxItem[] = [];
    for (const { id } of candidates) {
      const item = await this.claim({ id }, now, leaseMs);
      if (item) claimed.push(item);
    }
    return claimed;
  }

  claimForNotification(notificationId: string, now: Date, leaseMs: number): Promise<OutboxItem | null> {
    return this.claim({ notificationId }, now, leaseMs);
  }

  private async claim(where: { id: string } | { notificationId: string }, now: Date, leaseMs: number): Promise<OutboxItem | null> {
    // El UPDATE condicionado decide quién gana: solo una de dos tomas simultáneas ve count = 1.
    const taken = await this.prisma.emailOutbox.updateMany({
      where: { ...where, status: 'PENDING', nextAttemptAt: { lte: now } },
      data: { nextAttemptAt: new Date(now.getTime() + leaseMs) },
    });
    if (taken.count !== 1) return null;
    const row = await this.prisma.emailOutbox.findFirst({ where, include: { notification: true } });
    return row ? toItem(row as Row) : null;
  }

  async markSent(id: string, at: Date): Promise<void> {
    await this.prisma.emailOutbox.update({ where: { id }, data: { status: 'SENT', sentAt: at, lastError: null } });
  }

  async markFailed(id: string, attempts: number, error: string, nextAttemptAt: Date | null): Promise<void> {
    await this.prisma.emailOutbox.update({
      where: { id },
      data: nextAttemptAt
        ? { attempts, lastError: error.slice(0, 500), nextAttemptAt }
        : { attempts, lastError: error.slice(0, 500), status: 'FAILED' },
    });
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    await this.prisma.emailOutbox.update({ where: { id }, data: { status: 'SKIPPED', lastError: reason } });
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.prisma.emailOutbox.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }
}
