import { PrismaClient, Prisma } from '@prisma/client';
import { TutoringRequest, TutoringRequestStatus } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
  TutoringRequestAttention,
} from '@domain/repositories/TutoringRequestRepository';

export class PrismaTutoringRequestRepository implements TutoringRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(
    data: Parameters<TutoringRequestRepository['create']>[0],
  ): Promise<TutoringRequest> {
    return this.prisma.tutoringRequest.create({ data }) as Promise<TutoringRequest>;
  }

  findById(id: string): Promise<TutoringRequest | null> {
    return this.prisma.tutoringRequest.findUnique({ where: { id } }) as Promise<TutoringRequest | null>;
  }

  findAll(filters?: TutoringRequestFilters): Promise<TutoringRequest[]> {
    const where: Prisma.TutoringRequestWhereInput = {
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.routedToId && { routedToId: filters.routedToId }),
      ...(filters?.status && { status: filters.status }),
    };
    return this.prisma.tutoringRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as Promise<TutoringRequest[]>;
  }

  findByStudent(studentId: string): Promise<TutoringRequest[]> {
    return this.prisma.tutoringRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<TutoringRequest[]>;
  }

  async updateAttention(
    id: string,
    expectedStatus: TutoringRequestStatus,
    attention: TutoringRequestAttention,
  ): Promise<TutoringRequest | null> {
    // Condicional: si otra persona ya cambió el estado, no se pisa su cambio.
    const { count } = await this.prisma.tutoringRequest.updateMany({
      where: { id, status: expectedStatus },
      data: attention,
    });
    return count === 1 ? this.findById(id) : null;
  }

  async attachFollowUp(
    id: string,
    followUp: { sessionId: string } | { referralId: string },
    handledById: string,
    replacingSessionId?: string,
  ): Promise<TutoringRequest | null> {
    // Condicional sobre «sin vínculo» (o sobre seguir vinculada a la sesión cancelada que se reemplaza): dos personas no crean
    // dos atenciones para la misma solicitud.
    const { count } = await this.prisma.tutoringRequest.updateMany({
      where: { id, sessionId: replacingSessionId ?? null, referralId: null },
      data: { ...followUp, ...(replacingSessionId && 'referralId' in followUp ? { sessionId: null } : {}), handledById, handledAt: new Date() },
    });
    if (count !== 1) return null;
    // Pendiente → en atención (si ya estaba en atención o atendida, se conserva).
    await this.prisma.tutoringRequest.updateMany({ where: { id, status: 'PENDIENTE' }, data: { status: 'EN_ATENCION' } });
    return this.findById(id);
  }
}
