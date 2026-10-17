import { PrismaClient } from '@prisma/client';
import { Admonition, AdmonitionFilters, AdmonitionRepository, NewAdmonition } from '@domain/repositories/AdmonitionRepository';

export class PrismaAdmonitionRepository implements AdmonitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: NewAdmonition): Promise<Admonition> {
    return this.prisma.admonition.create({ data });
  }

  findById(id: string): Promise<Admonition | null> {
    return this.prisma.admonition.findUnique({ where: { id } });
  }

  list(filters: AdmonitionFilters = {}): Promise<Admonition[]> {
    return this.prisma.admonition.findMany({
      where: {
        ...(filters.facultyId && { facultyId: filters.facultyId }),
        ...(filters.schoolIds && { schoolId: { in: filters.schoolIds } }),
        ...(filters.tutorId && { tutorId: filters.tutorId }),
      },
      orderBy: [{ issuedOn: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
