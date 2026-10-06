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
}
