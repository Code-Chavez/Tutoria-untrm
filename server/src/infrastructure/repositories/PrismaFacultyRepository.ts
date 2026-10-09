import { PrismaClient } from '@prisma/client';
import { Faculty } from '@domain/entities/Faculty';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';

export class PrismaFacultyRepository implements FacultyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<Faculty[]> {
    return this.prisma.faculty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
