import { PrismaClient } from '@prisma/client';
import { CommitteeResolutionRecord, CommitteeResolutionRepository } from '@domain/repositories/CommitteeResolutionRepository';

export class PrismaCommitteeResolutionRepository implements CommitteeResolutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  upsert(input: { periodId: string; schoolId: string; number: string; issuedOn: Date; createdById: string }): Promise<CommitteeResolutionRecord> {
    return this.prisma.committeeResolution.upsert({
      where: { periodId_schoolId: { periodId: input.periodId, schoolId: input.schoolId } },
      create: input,
      update: { number: input.number, issuedOn: input.issuedOn, createdById: input.createdById },
    });
  }

  find(periodId: string, schoolId: string): Promise<CommitteeResolutionRecord | null> {
    return this.prisma.committeeResolution.findUnique({ where: { periodId_schoolId: { periodId, schoolId } } });
  }

  list(filters: { schoolIds?: string[]; periodId?: string; schoolId?: string }): Promise<CommitteeResolutionRecord[]> {
    const schoolCondition =
      filters.schoolIds && filters.schoolId
        ? { schoolId: { in: filters.schoolIds.filter((id) => id === filters.schoolId) } }
        : filters.schoolIds
          ? { schoolId: { in: filters.schoolIds } }
          : filters.schoolId
            ? { schoolId: filters.schoolId }
            : {};
    return this.prisma.committeeResolution.findMany({
      where: { ...schoolCondition, ...(filters.periodId && { periodId: filters.periodId }) },
      orderBy: [{ issuedOn: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
