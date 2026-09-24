import { PrismaClient, Prisma } from '@prisma/client';
import { TutoringRequest } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
} from '@domain/repositories/TutoringRequestRepository';

export class PrismaTutoringRequestRepository implements TutoringRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Omit<TutoringRequest, 'id' | 'createdAt'>): Promise<TutoringRequest> {
    return this.prisma.tutoringRequest.create({ data }) as Promise<TutoringRequest>;
  }

  findAll(filters?: TutoringRequestFilters): Promise<TutoringRequest[]> {
    const where: Prisma.TutoringRequestWhereInput = {
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.routedToId && { routedToId: filters.routedToId }),
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
}
