import { PrismaClient } from '@prisma/client';
import { SystemParameter } from '@domain/entities/SystemParameter';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';

export class PrismaSystemParameterRepository implements SystemParameterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByKey(key: string): Promise<SystemParameter | null> {
    return this.prisma.systemParameter.findUnique({ where: { key } });
  }
}
