import { PrismaClient } from '@prisma/client';
import { StudentReferral, ReferralAspectCode, ReferralService } from '@domain/entities/StudentReferral';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';

function toReferral(row: {
  id: string;
  studentId: string;
  referredById: string;
  checkedAspects: string[];
  reason: string;
  service: string;
  createdAt: Date;
}): StudentReferral {
  return {
    id: row.id,
    studentId: row.studentId,
    referredById: row.referredById,
    checkedAspects: row.checkedAspects as ReferralAspectCode[],
    reason: row.reason,
    service: row.service as ReferralService,
    createdAt: row.createdAt,
  };
}

export class PrismaStudentReferralRepository implements StudentReferralRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<StudentReferral, 'id' | 'createdAt'>): Promise<StudentReferral> {
    const row = await this.prisma.studentReferral.create({ data });
    return toReferral(row);
  }

  async findById(id: string): Promise<StudentReferral | null> {
    const row = await this.prisma.studentReferral.findUnique({ where: { id } });
    return row ? toReferral(row) : null;
  }
}
