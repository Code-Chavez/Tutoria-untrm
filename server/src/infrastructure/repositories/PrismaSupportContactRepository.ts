import { PrismaClient } from '@prisma/client';
import { SupportContact } from '@domain/entities/SupportContact';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';

export class PrismaSupportContactRepository implements SupportContactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByStudent(studentId: string): Promise<SupportContact | null> {
    return this.prisma.supportContact.findUnique({ where: { studentId } });
  }

  upsert(
    studentId: string,
    data: Omit<SupportContact, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>,
  ): Promise<SupportContact> {
    return this.prisma.supportContact.upsert({
      where: { studentId },
      update: data,
      create: { studentId, ...data },
    });
  }
}
