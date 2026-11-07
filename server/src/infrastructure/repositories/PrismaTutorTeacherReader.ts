import { PrismaClient } from '@prisma/client';
import { TUTOR_ROLE_NAME } from '@application/use-cases/assignments/TutorValidation';
import { TutorTeacherData, TutorTeacherReader } from '@domain/repositories/TutorTeacherReader';

export class PrismaTutorTeacherReader implements TutorTeacherReader {
  constructor(private readonly prisma: PrismaClient) {}

  async read(filters: { periodId: string; schoolIds?: string[] }): Promise<TutorTeacherData> {
    const inScope = filters.schoolIds ? { schoolId: { in: filters.schoolIds } } : {};
    const [assignments, certificates] = await Promise.all([
      this.prisma.cycleTutorAssignment.findMany({
        where: { periodId: filters.periodId, ...inScope },
        select: { tutorId: true, schoolId: true, cycle: true, acceptanceStatus: true, acceptanceExpiresAt: true },
        orderBy: [{ schoolId: 'asc' }, { cycle: 'asc' }],
      }),
      this.prisma.certificate.findMany({
        where: { periodId: filters.periodId, ...inScope },
        select: { id: true, tutorId: true, schoolId: true, status: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);
    const assignedIds = [...new Set(assignments.map((a) => a.tutorId))];
    const teachers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ role: { name: TUTOR_ROLE_NAME }, ...inScope }, { id: { in: assignedIds } }],
      },
      select: { id: true, firstName: true, lastName: true, schoolId: true },
    });
    return { teachers, assignments, certificates };
  }
}
