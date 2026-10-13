import { Prisma, PrismaClient } from '@prisma/client';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { UserNameLookup } from '@domain/repositories/UserNameLookup';
import { DuplicateEmailError } from '@application/use-cases/users/UserErrors';

export class PrismaUserRepository implements UserRepository, UserNameLookup {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    // Sin distinguir mayúsculas: cubre cuentas guardadas antes de normalizar el correo.
    return this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  }

  async findNamesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
    return new Map(rows.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }

  findAll(filters?: { isActive?: boolean; roleId?: string; service?: string }): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.roleId && { roleId: filters.roleId }),
        ...(filters?.service && { service: filters.service }),
      },
    });
  }

  // Si dos altas con el mismo correo llegan a la vez, la restricción única de la base decide: se informa como duplicado.
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateEmailError(data.email);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error) && data.email) throw new DuplicateEmailError(data.email);
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
