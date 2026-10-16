import { PrismaClient } from '@prisma/client';
import { captureRosterSnapshot } from './PrismaPeriodRosterRepository';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';

export class PrismaAcademicPeriodRepository implements AcademicPeriodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActive(): Promise<AcademicPeriod | null> {
    return this.prisma.academicPeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(): Promise<AcademicPeriod[]> {
    return this.prisma.academicPeriod.findMany({ orderBy: { startDate: 'desc' } });
  }

  findById(id: string): Promise<AcademicPeriod | null> {
    return this.prisma.academicPeriod.findUnique({ where: { id } });
  }

  findByDate(date: Date): Promise<AcademicPeriod | null> {
    // endDate se guarda como la medianoche del último día: se le suma un día para que ese día entre completo.
    const dayBefore = new Date(date.getTime() - 24 * 60 * 60_000);
    return this.prisma.academicPeriod.findFirst({
      where: { startDate: { lte: date }, endDate: { gt: dayBefore } },
      orderBy: { startDate: 'desc' },
    });
  }

  async close(id: string, closedById: string, closedAt: Date, summary: unknown): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // El UPDATE condicionado decide: si ya no estaba vigente, otro proceso lo cerró antes.
      const updated = await tx.academicPeriod.updateMany({
        where: { id, isActive: true },
        data: { isActive: false, closedAt, closedById, closureSummary: summary as object },
      });
      if (updated.count !== 1) return false;
      await captureRosterSnapshot(tx, id);
      return true;
    });
  }

  async reopen(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if ((await tx.academicPeriod.count({ where: { isActive: true } })) > 0) return false;
      const updated = await tx.academicPeriod.updateMany({
        where: { id, isActive: false, closedAt: { not: null } },
        data: { isActive: true, closedAt: null, closedById: null },
      });
      return updated.count === 1;
    });
  }
}
