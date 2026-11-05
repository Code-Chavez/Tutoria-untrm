import { Prisma, PrismaClient } from '@prisma/client';
import { Campus } from '@domain/entities/Campus';
import { CampusRepository } from '@domain/repositories/CampusRepository';
import { DuplicateCampusError } from '@application/use-cases/campuses/CampusUseCases';

export class PrismaCampusRepository implements CampusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<Campus[]> {
    return this.prisma.campus.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Campus | null> {
    return this.prisma.campus.findUnique({ where: { id } });
  }

  async create(name: string): Promise<Campus> {
    try {
      return await this.prisma.campus.create({ data: { name } });
    } catch (error) {
      throw translate(error, name);
    }
  }

  async rename(id: string, name: string): Promise<Campus> {
    try {
      return await this.prisma.campus.update({ where: { id }, data: { name } });
    } catch (error) {
      throw translate(error, name);
    }
  }

  setActive(id: string, isActive: boolean): Promise<Campus> {
    return this.prisma.campus.update({ where: { id }, data: { isActive } });
  }

  async setSchoolCampus(schoolId: string, campusId: string): Promise<void> {
    await this.prisma.school.update({ where: { id: schoolId }, data: { campusId } });
  }
}

function translate(error: unknown, name: string): unknown {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? new DuplicateCampusError(name) : error;
}
