import { PrismaClient } from '@prisma/client';
import { School } from '@domain/entities/School';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';

export class PrismaSchoolRepository implements SchoolRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<School[]> {
    return this.prisma.school.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<School | null> {
    return this.prisma.school.findUnique({ where: { id } });
  }
}
