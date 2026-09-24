import { PrismaClient } from '@prisma/client';
import { TutorAssignmentHistory } from '@domain/entities/TutorAssignmentHistory';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';

export class PrismaTutorAssignmentHistoryRepository implements TutorAssignmentHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(
    data: Omit<TutorAssignmentHistory, 'id' | 'createdAt'>,
  ): Promise<TutorAssignmentHistory> {
    return this.prisma.tutorAssignmentHistory.create({ data });
  }

  findByStudent(studentId: string): Promise<TutorAssignmentHistory[]> {
    return this.prisma.tutorAssignmentHistory.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
