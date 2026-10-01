import { PrismaClient } from '@prisma/client';
import { EvaluationWindow } from '@domain/entities/EvaluationWindow';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';

export class PrismaEvaluationWindowRepository implements EvaluationWindowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByPeriodAndSchool(periodId: string, schoolId: string): Promise<EvaluationWindow | null> {
    return this.prisma.evaluationWindow.findUnique({
      where: { periodId_schoolId: { periodId, schoolId } },
    });
  }

  findAllByPeriod(periodId: string): Promise<EvaluationWindow[]> {
    return this.prisma.evaluationWindow.findMany({ where: { periodId } });
  }

  upsert(periodId: string, schoolId: string, isOpen: boolean): Promise<EvaluationWindow> {
    return this.prisma.evaluationWindow.upsert({
      where: { periodId_schoolId: { periodId, schoolId } },
      update: { isOpen },
      create: { periodId, schoolId, isOpen },
    });
  }
}
