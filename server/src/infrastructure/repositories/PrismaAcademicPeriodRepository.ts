import { PrismaClient } from '@prisma/client';
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
}
