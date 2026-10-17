import { PrismaClient } from '@prisma/client';
import { CycleStudent, CycleTutorAssignment, CycleTutorRepository } from '@domain/repositories/CycleTutorRepository';

export class PrismaCycleTutorRepository implements CycleTutorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listBySchool(periodId: string, schoolId: string): Promise<CycleTutorAssignment[]> {
    return this.prisma.cycleTutorAssignment.findMany({ where: { periodId, schoolId }, orderBy: { cycle: 'asc' } });
  }

  find(periodId: string, schoolId: string, cycle: number): Promise<CycleTutorAssignment | null> {
    return this.prisma.cycleTutorAssignment.findUnique({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle } } });
  }

  listByTutor(periodId: string, tutorId: string): Promise<CycleTutorAssignment[]> {
    return this.prisma.cycleTutorAssignment.findMany({ where: { periodId, tutorId } });
  }

  upsert(input: Omit<CycleTutorAssignment, 'id' | 'createdAt'>): Promise<CycleTutorAssignment> {
    const { periodId, schoolId, cycle, ...data } = input;
    return this.prisma.cycleTutorAssignment.upsert({
      where: { periodId_schoolId_cycle: { periodId, schoolId, cycle } },
      update: data,
      create: input,
    });
  }

  async remove(periodId: string, schoolId: string, cycle: number): Promise<boolean> {
    const { count } = await this.prisma.cycleTutorAssignment.deleteMany({ where: { periodId, schoolId, cycle } });
    return count > 0;
  }

  async studentsOfCycle(periodId: string, schoolId: string, cycle: number): Promise<CycleStudent[]> {
    const rows = await this.prisma.periodEnrollment.findMany({
      where: { periodId, schoolId, cycle, student: { isActive: true } },
      select: { studentId: true, student: { select: { tutorId: true } } },
    });
    return rows.map((r) => ({ studentId: r.studentId, tutorId: r.student.tutorId }));
  }

  async enrolledByCycle(periodId: string, schoolId: string): Promise<Map<number, { total: number; withoutTutor: number }>> {
    const rows = await this.prisma.periodEnrollment.findMany({
      where: { periodId, schoolId, student: { isActive: true } },
      select: { cycle: true, student: { select: { tutorId: true } } },
    });
    const byCycle = new Map<number, { total: number; withoutTutor: number }>();
    for (const row of rows) {
      const entry = byCycle.get(row.cycle) ?? { total: 0, withoutTutor: 0 };
      entry.total += 1;
      if (!row.student.tutorId) entry.withoutTutor += 1;
      byCycle.set(row.cycle, entry);
    }
    return byCycle;
  }
}
