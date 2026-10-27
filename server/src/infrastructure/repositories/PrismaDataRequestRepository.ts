import { Prisma, PrismaClient } from '@prisma/client';
import {
  DataRequest,
  DataRequestKind,
  DataRequestRepository,
  DataRequestStatus,
  DataRequestTx,
  NewDataRequest,
  OperationIdTakenError,
} from '@domain/repositories/DataRequestRepository';

const toDomain = (row: { status: string; kind: string } & Omit<DataRequest, 'status' | 'kind'>): DataRequest => ({ ...row, status: row.status as DataRequestStatus, kind: row.kind as DataRequestKind });

const COUNTING: DataRequestStatus[] = ['PENDIENTE', 'ENVIADO', 'INCIERTO'];

class PrismaDataRequestTx implements DataRequestTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findByOperation(requestedById: string, operationId: string): Promise<DataRequest | null> {
    const row = await this.tx.dataRequest.findUnique({ where: { requestedById_operationId: { requestedById, operationId } } });
    return row ? toDomain(row) : null;
  }

  async expireStalePending(equivalenceKey: string, cutoff: Date): Promise<void> {
    await this.tx.dataRequest.updateMany({
      where: { equivalenceKey, status: 'PENDIENTE', attemptStartedAt: { lt: cutoff } },
      data: { status: 'INCIERTO', error: 'SIN_RESULTADO' },
    });
  }

  async findLatestCounting(equivalenceKey: string, since: Date): Promise<DataRequest | null> {
    const row = await this.tx.dataRequest.findFirst({
      where: { equivalenceKey, createdAt: { gte: since }, status: { in: COUNTING } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toDomain(row) : null;
  }

  async insertPending(data: NewDataRequest): Promise<DataRequest> {
    try {
      return toDomain(await this.tx.dataRequest.create({ data: { ...data, status: 'PENDIENTE', error: null } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new OperationIdTakenError();
      throw error;
    }
  }
}

export class PrismaDataRequestRepository implements DataRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  reserve<T>(equivalenceKey: string, work: (tx: DataRequestTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        // Candado de la transacción, por clave: las peticiones equivalentes se atienden una tras otra. Se suelta al terminar
        // la transacción (milisegundos): nunca se mantiene abierta durante el envío del correo.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${equivalenceKey}, 0))`;
        return work(new PrismaDataRequestTx(tx));
      },
      { timeout: 10_000 },
    );
  }

  async finishAttempt(id: string, attemptStartedAt: Date, result: { status: 'ENVIADO' | 'FALLIDO' | 'INCIERTO'; error: string | null }, notBefore: Date): Promise<DataRequest | null> {
    // Condicional: solo si sigue PENDIENTE, es ese mismo intento y no venció el margen. Un resultado tardío no pisa un INCIERTO.
    const updated = await this.prisma.dataRequest.updateMany({
      where: { id, status: 'PENDIENTE', AND: [{ attemptStartedAt }, { attemptStartedAt: { gte: notBefore } }] },
      data: { status: result.status, error: result.error },
    });
    if (updated.count !== 1) return null;
    return this.findById(id);
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
