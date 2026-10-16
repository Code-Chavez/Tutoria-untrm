import { PrismaClient } from '@prisma/client';
import { PeriodEnrollmentRepository } from '@domain/repositories/PeriodEnrollmentRepository';

export class PrismaPeriodEnrollmentRepository implements PeriodEnrollmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async enroll(input: { periodId: string; studentId: string; schoolId: string; cycle: number }): Promise<void> {
    await this.prisma.periodEnrollment.upsert({
      where: { periodId_studentId: { periodId: input.periodId, studentId: input.studentId } },
      update: { schoolId: input.schoolId, cycle: input.cycle },
      create: input,
    });
  }

  async isEnrolled(periodId: string, studentId: string): Promise<boolean> {
    return (await this.prisma.periodEnrollment.count({ where: { periodId, studentId } })) > 0;
  }

  count(periodId: string): Promise<number> {
    return this.prisma.periodEnrollment.count({ where: { periodId } });
  }
}
