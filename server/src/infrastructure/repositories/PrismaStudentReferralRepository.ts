import { PrismaClient } from '@prisma/client';
import { StudentReferral, ReferralAspectCode, ReferralService, ReferralStatus, ReferralStatusHistory } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';

function toReferral(row: any): StudentReferral {
  return {
    id: row.id,
    studentId: row.studentId,
    referredById: row.referredById,
    checkedAspects: row.checkedAspects as ReferralAspectCode[],
    reason: row.reason,
    service: row.service as ReferralService,
    receivingInstance: row.receivingInstance,
    status: row.status as ReferralStatus,
    statusHistory: row.statusHistory ? row.statusHistory.map((h: any) => ({
      id: h.id,
      referralId: h.referralId,
      status: h.status as ReferralStatus,
      notes: h.notes,
      changedById: h.changedById,
      createdAt: h.createdAt,
    })) : undefined,
    createdAt: row.createdAt,
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
