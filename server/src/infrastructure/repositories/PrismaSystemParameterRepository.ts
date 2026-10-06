import { PrismaClient } from '@prisma/client';
import { SystemParameter } from '@domain/entities/SystemParameter';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';

export class PrismaSystemParameterRepository implements SystemParameterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByKey(key: string): Promise<SystemParameter | null> {
    return this.prisma.systemParameter.findUnique({ where: { key } });
  }

  findAll(): Promise<SystemParameter[]> {
    return this.prisma.systemParameter.findMany({ orderBy: { key: 'asc' } });
  }

  create(data: Omit<SystemParameter, 'id'>): Promise<SystemParameter> {
    return this.prisma.systemParameter.create({ data });
  }

  update(key: string, value: string): Promise<SystemParameter> {
    return this.prisma.systemParameter.update({ where: { key }, data: { value } });
  }
}
