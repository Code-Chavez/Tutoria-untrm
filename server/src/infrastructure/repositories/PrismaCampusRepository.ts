import { Prisma, PrismaClient } from '@prisma/client';
import { Campus, CampusKind } from '@domain/entities/Campus';
import { CampusRepository } from '@domain/repositories/CampusRepository';
import { DuplicateCampusError } from '@application/use-cases/campuses/CampusUseCases';

export class PrismaCampusRepository implements CampusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<Campus[]> {
    return this.prisma.campus.findMany({ orderBy: { name: 'asc' } }) as Promise<Campus[]>;
  }

  findById(id: string): Promise<Campus | null> {
    return this.prisma.campus.findUnique({ where: { id } }) as Promise<Campus | null>;
  }

  async create(name: string, kind: CampusKind = 'SEDE'): Promise<Campus> {
    try {
      return (await this.prisma.campus.create({ data: { name, kind } })) as Campus;
    } catch (error) {
      throw translate(error, name);
    }
  }

  async rename(id: string, name: string): Promise<Campus> {
    try {
      return (await this.prisma.campus.update({ where: { id }, data: { name } })) as Campus;
    } catch (error) {
      throw translate(error, name);
    }
  }

  setActive(id: string, isActive: boolean): Promise<Campus> {
    return this.prisma.campus.update({ where: { id }, data: { isActive } }) as Promise<Campus>;
  }

  setCity(id: string, city: string | null): Promise<Campus> {
    return this.prisma.campus.update({ where: { id }, data: { city } }) as Promise<Campus>;
  }

  setKind(id: string, kind: CampusKind): Promise<Campus> {
    return this.prisma.campus.update({ where: { id }, data: { kind } }) as Promise<Campus>;
  }

  async setSchoolCampus(schoolId: string, campusId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.school.findUnique({ where: { id: schoolId }, select: { campusId: true } });
      // Cambiar la sede principal la mueve: la anterior deja de figurar, salvo que se haya agregado como otra sede (no se distingue aquí).
      if (current?.campusId && current.campusId !== campusId) await tx.schoolCampus.deleteMany({ where: { schoolId, campusId: current.campusId } });
      await tx.schoolCampus.upsert({ where: { schoolId_campusId: { schoolId, campusId } }, create: { schoolId, campusId }, update: {} });
      await tx.school.update({ where: { id: schoolId }, data: { campusId } });
    });
  }

  async campusIdsBySchool(): Promise<Map<string, string[]>> {
    const rows = await this.prisma.schoolCampus.findMany({ select: { schoolId: true, campusId: true } });
    const map = new Map<string, string[]>();
    for (const { schoolId, campusId } of rows) map.set(schoolId, [...(map.get(schoolId) ?? []), campusId]);
    return map;
  }

  async campusIdsOf(schoolId: string): Promise<string[]> {
    return (await this.prisma.schoolCampus.findMany({ where: { schoolId }, select: { campusId: true } })).map((r) => r.campusId);
  }

  async setSchoolCampuses(schoolId: string, campusIds: string[], mainCampusId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolCampus.deleteMany({ where: { schoolId } });
      await tx.schoolCampus.createMany({ data: campusIds.map((campusId) => ({ schoolId, campusId })) });
      await tx.school.update({ where: { id: schoolId }, data: { campusId: mainCampusId } });
    });
  }
}

function translate(error: unknown, name: string): unknown {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? new DuplicateCampusError(name) : error;
}
