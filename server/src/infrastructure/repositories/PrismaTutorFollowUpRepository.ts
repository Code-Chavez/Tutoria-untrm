import { PrismaClient } from '@prisma/client';
import { TutorFollowUp } from '@domain/entities/TutorFollowUp';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';

export class PrismaTutorFollowUpRepository implements TutorFollowUpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Omit<TutorFollowUp, 'id' | 'createdAt'>): Promise<TutorFollowUp> {
    return this.prisma.tutorFollowUp.create({ data });
  }

  findByStudent(studentId: string): Promise<TutorFollowUp[]> {
    return this.prisma.tutorFollowUp.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
