import { PrismaClient } from '@prisma/client';
import { DataRequest, DataRequestRepository, DataRequestStatus } from '@domain/repositories/DataRequestRepository';

const toDomain = (row: { status: string } & Omit<DataRequest, 'status'>): DataRequest => ({ ...row, status: row.status as DataRequestStatus });

export class PrismaDataRequestRepository implements DataRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<DataRequest, 'id' | 'createdAt' | 'receivedAt' | 'receivedById'>): Promise<DataRequest> {
    return toDomain(await this.prisma.dataRequest.create({ data }));
  }

  async list(filters?: { schoolIds?: string[]; periodId?: string }): Promise<DataRequest[]> {
    const rows = await this.prisma.dataRequest.findMany({
      where: {
        ...(filters?.schoolIds ? { schoolId: { in: filters.schoolIds } } : {}),
        ...(filters?.periodId ? { periodId: filters.periodId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<DataRequest | null> {
    const row = await this.prisma.dataRequest.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async markReceived(id: string, byId: string, at: Date): Promise<DataRequest | null> {
    const updated = await this.prisma.dataRequest.updateMany({ where: { id, receivedAt: null }, data: { receivedAt: at, receivedById: byId } });
    if (updated.count !== 1) return this.findById(id);
    return this.findById(id);
  }
}
