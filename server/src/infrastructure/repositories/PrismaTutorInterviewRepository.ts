import { PrismaClient } from '@prisma/client';
import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';

export class PrismaTutorInterviewRepository implements TutorInterviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Omit<TutorInterview, 'id' | 'createdAt' | 'updatedAt'>): Promise<TutorInterview> {
    return this.prisma.tutorInterview.create({ data });
  }

  findByStudent(studentId: string): Promise<TutorInterview[]> {
    return this.prisma.tutorInterview.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
