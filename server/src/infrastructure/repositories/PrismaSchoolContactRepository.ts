import { PrismaClient } from '@prisma/client';
import { SchoolContactRepository } from '@domain/repositories/SchoolContactRepository';

export class PrismaSchoolContactRepository implements SchoolContactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async setRequestEmail(schoolId: string, email: string | null): Promise<void> {
    await this.prisma.school.update({ where: { id: schoolId }, data: { requestEmail: email } });
  }
}
