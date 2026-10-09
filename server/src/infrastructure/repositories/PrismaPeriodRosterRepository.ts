import { Prisma, PrismaClient } from '@prisma/client';
import { Student } from '@domain/entities/Student';
import { PeriodRosterRepository } from '@domain/repositories/PeriodRosterRepository';

/**
 * Congela la matrícula actual como corte del semestre. Es idempotente: si el
 * semestre ya tiene corte no se toca, así que cerrarlo dos veces no lo altera.
 */
export async function captureRosterSnapshot(
  db: Prisma.TransactionClient | PrismaClient,
  periodId: string,
): Promise<void> {
  if ((await db.studentPeriodSnapshot.count({ where: { periodId } })) > 0) return;
  const students = await db.student.findMany({
    select: { id: true, schoolId: true, cycle: true, tutorId: true, isActive: true, isAtRisk: true },
  });
  await db.studentPeriodSnapshot.createMany({
    data: students.map((s) => ({
      periodId,
      studentId: s.id,
      schoolId: s.schoolId,
      cycle: s.cycle,
      tutorId: s.tutorId,
      isActive: s.isActive,
      isAtRisk: s.isAtRisk,
    })),
    skipDuplicates: true,
  });
}

export class PrismaPeriodRosterRepository implements PeriodRosterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPeriod(periodId: string): Promise<Student[] | null> {
    const rows = await this.prisma.studentPeriodSnapshot.findMany({
      where: { periodId },
      include: { student: true },
    });
    if (rows.length === 0) return null;
    // La identidad del tutorado es la actual; lo que cambia de un semestre a otro sale del corte.
    return rows.map(({ student, schoolId, cycle, tutorId, isActive, isAtRisk }) => ({
      ...student,
      schoolId,
      cycle,
      tutorId,
      isActive,
      isAtRisk,
    }));
  }
}
