import { PrismaClient } from '@prisma/client';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findAll(filters?: { isActive?: boolean; roleId?: string }): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.roleId && { roleId: filters.roleId }),
      },
    });
  }

  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
