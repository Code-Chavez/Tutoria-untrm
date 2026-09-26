import { PrismaClient } from '@prisma/client';
import { StudentReferral, ReferralAspectCode, ReferralService, ReferralStatus } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';

function toReferral(row: unknown): StudentReferral {
  const r = row as any;
  return {
    id: r.id,
    studentId: r.studentId,
    referredById: r.referredById,
    checkedAspects: r.checkedAspects as ReferralAspectCode[],
    reason: r.reason,
    service: r.service as ReferralService,
    receivingInstance: r.receivingInstance,
    status: r.status as ReferralStatus,
    statusHistory: r.statusHistory ? r.statusHistory.map((h: unknown) => {
      const historyRow = h as any;
      return {
        id: historyRow.id,
        referralId: historyRow.referralId,
        status: historyRow.status as ReferralStatus,
        notes: historyRow.notes,
        changedById: historyRow.changedById,
        createdAt: historyRow.createdAt,
      };
    }) : undefined,
    createdAt: r.createdAt,
  };
}

export class PrismaStudentReferralRepository implements StudentReferralRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<StudentReferral, 'id' | 'createdAt' | 'statusHistory' | 'status'>): Promise<StudentReferral> {
    const row = await this.prisma.studentReferral.create({ 
      data: {
        ...data,
        status: 'ENVIADO',
      },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } }
    });
    return toReferral(row);
  }

  async findById(id: string): Promise<StudentReferral | null> {
    const row = await this.prisma.studentReferral.findUnique({
      where: { id },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
    return row ? toReferral(row) : null;
  }

  async findMany(filters: { referredById?: string; service?: string }): Promise<StudentReferral[]> {
    const rows = await this.prisma.studentReferral.findMany({
      where: {
        ...(filters.referredById ? { referredById: filters.referredById } : {}),
        ...(filters.service ? { service: filters.service } : {}),
      },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toReferral);
  }

  async updateStatus(referralId: string, status: string, changedById: string, notes?: string): Promise<StudentReferral> {
    const row = await this.prisma.studentReferral.update({
      where: { id: referralId },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            notes,
            changedById,
          },
        },
      },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
    return toReferral(row);
  }
}
