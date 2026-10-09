import { PrismaClient } from '@prisma/client';
import { CatalogEntry, CatalogInput, CatalogKind } from '@domain/entities/Catalog';
import { CatalogRepository } from '@domain/repositories/CatalogRepository';
import { captureRosterSnapshot } from './PrismaPeriodRosterRepository';

// Tipos que viven en la tabla genérica catalog_items.
const ITEM_CATALOG: Partial<Record<CatalogKind, string>> = {
  cycles: 'CYCLE',
  services: 'SERVICE',
  motives: 'MOTIVE',
};

// Cada motivo de la entrevista inicial (Anexo N°3) es una columna booleana.
const MOTIVE_COLUMN: Record<string, 'motiveAcademic' | 'motivePersonalEmotional' | 'motiveVocational'> = {
  ACADEMIC: 'motiveAcademic',
  PERSONAL_EMOTIONAL: 'motivePersonalEmotional',
  VOCATIONAL: 'motiveVocational',
};

const blank = (kind: CatalogKind): Omit<CatalogEntry, 'id' | 'name' | 'isActive' | 'usage'> => ({
  kind,
  code: null,
  facultyId: null,
  startDate: null,
  endDate: null,
});

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(kind: CatalogKind): Promise<CatalogEntry[]> {
    switch (kind) {
      case 'faculties': {
        const rows = await this.prisma.faculty.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { schools: true } } },
        });
        return rows.map((r) => ({
          ...blank(kind),
          id: r.id,
          name: r.name,
          isActive: r.isActive,
          usage: r._count.schools,
        }));
      }
      case 'schools': {
        const rows = await this.prisma.school.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { students: true, evaluationWindows: true, workPlans: true } } },
        });
        return rows.map((r) => ({
          ...blank(kind),
          id: r.id,
          name: r.name,
          isActive: r.isActive,
          facultyId: r.facultyId,
          usage: r._count.students + r._count.evaluationWindows + r._count.workPlans,
        }));
      }
      case 'periods': {
        const rows = await this.prisma.academicPeriod.findMany({
          orderBy: { startDate: 'desc' },
          include: {
            _count: { select: { evaluations: true, evaluationWindows: true, workPlans: true, tutorSemesterReports: true } },
          },
        });
        return rows.map((r) => ({
          ...blank(kind),
          id: r.id,
          name: r.name,
          isActive: r.isActive,
          startDate: r.startDate,
          endDate: r.endDate,
          usage:
            r._count.evaluations + r._count.evaluationWindows + r._count.workPlans + r._count.tutorSemesterReports,
        }));
      }
      default:
        return this.listItems(kind);
    }
  }

  private async listItems(kind: CatalogKind): Promise<CatalogEntry[]> {
    const rows = await this.prisma.catalogItem.findMany({ where: { catalog: ITEM_CATALOG[kind] } });
    const entries = await Promise.all(
      rows.map(async (r) => ({
        ...blank(kind),
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        code: r.code,
        usage: await this.itemUsage(kind, r.code),
      })),
    );
    // Los ciclos se ordenan numéricamente; el resto, por nombre.
    return entries.sort((a, b) =>
      kind === 'cycles' ? Number(a.code) - Number(b.code) : a.name.localeCompare(b.name),
    );
  }

  private async itemUsage(kind: CatalogKind, code: string): Promise<number> {
    if (kind === 'cycles') return this.prisma.student.count({ where: { cycle: Number(code) } });
    if (kind === 'services') return this.prisma.studentReferral.count({ where: { service: code } });
    const column = MOTIVE_COLUMN[code];
    // Un motivo nuevo no tiene columna propia en la entrevista: nunca consta como usado.
    return column ? this.prisma.tutorInterview.count({ where: { [column]: true } }) : 0;
  }

  async findById(kind: CatalogKind, id: string): Promise<CatalogEntry | null> {
    return (await this.list(kind)).find((e) => e.id === id) ?? null;
  }

  async create(kind: CatalogKind, input: CatalogInput): Promise<CatalogEntry> {
    let id: string;
    switch (kind) {
      case 'faculties':
        id = (await this.prisma.faculty.create({ data: { name: input.name, isActive: input.isActive ?? true } })).id;
        break;
      case 'schools':
        id = (
          await this.prisma.school.create({
            data: { name: input.name, facultyId: input.facultyId as string, isActive: input.isActive ?? true },
          })
        ).id;
        break;
      case 'periods':
        id = (
          await this.prisma.academicPeriod.create({
            data: {
              name: input.name,
              startDate: input.startDate as Date,
              endDate: input.endDate as Date,
              isActive: input.isActive ?? false,
            },
          })
        ).id;
        break;
      default:
        id = (
          await this.prisma.catalogItem.create({
            data: {
              catalog: ITEM_CATALOG[kind] as string,
              code: input.code as string,
              name: input.name,
              isActive: input.isActive ?? true,
            },
          })
        ).id;
    }
    return (await this.findById(kind, id)) as CatalogEntry;
  }

  async update(kind: CatalogKind, id: string, input: Partial<CatalogInput>): Promise<CatalogEntry> {
    const common = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };
    switch (kind) {
      case 'faculties':
        await this.prisma.faculty.update({ where: { id }, data: common });
        break;
      case 'schools':
        await this.prisma.school.update({
          where: { id },
          data: { ...common, ...(input.facultyId !== undefined && { facultyId: input.facultyId }) },
        });
        break;
      case 'periods':
        await this.prisma.$transaction(async (tx) => {
          // Desactivar el semestre vigente lo cierra: se congela su matrícula antes de cualquier cambio posterior (A17).
          if (input.isActive === false) {
            const current = await tx.academicPeriod.findUnique({ where: { id } });
            if (current?.isActive) await captureRosterSnapshot(tx, id);
          }
          await tx.academicPeriod.update({
            where: { id },
            data: {
              ...common,
              ...(input.startDate !== undefined && { startDate: input.startDate }),
              ...(input.endDate !== undefined && { endDate: input.endDate }),
            },
          });
        });
        break;
      default:
        await this.prisma.catalogItem.update({ where: { id }, data: common });
    }
    return (await this.findById(kind, id)) as CatalogEntry;
  }

  async delete(kind: CatalogKind, id: string): Promise<void> {
    switch (kind) {
      case 'faculties':
        await this.prisma.faculty.delete({ where: { id } });
        break;
      case 'schools':
        await this.prisma.school.delete({ where: { id } });
        break;
      case 'periods':
        await this.prisma.academicPeriod.delete({ where: { id } });
        break;
      default:
        await this.prisma.catalogItem.delete({ where: { id } });
    }
  }

  async isDuplicate(
    kind: CatalogKind,
    input: Pick<CatalogInput, 'name' | 'code' | 'facultyId'>,
    excludeId?: string,
  ): Promise<boolean> {
    const notSelf = excludeId ? { id: { not: excludeId } } : {};
    const sameName = { name: { equals: input.name, mode: 'insensitive' as const } };
    switch (kind) {
      case 'faculties':
        return (await this.prisma.faculty.count({ where: { ...sameName, ...notSelf } })) > 0;
      case 'schools':
        return (
          (await this.prisma.school.count({ where: { ...sameName, facultyId: input.facultyId, ...notSelf } })) > 0
        );
      case 'periods':
        return (await this.prisma.academicPeriod.count({ where: { ...sameName, ...notSelf } })) > 0;
      default:
        return (
          (await this.prisma.catalogItem.count({
            where: {
              catalog: ITEM_CATALOG[kind],
              OR: [{ ...sameName }, ...(input.code ? [{ code: input.code }] : [])],
              ...notSelf,
            },
          })) > 0
        );
    }
  }

  async facultyExists(id: string): Promise<boolean> {
    return (await this.prisma.faculty.count({ where: { id } })) > 0;
  }

  async activateOnlyPeriod(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Los semestres que dejan de estar vigentes se cierran: se congela su matrícula (A17).
      const closing = await tx.academicPeriod.findMany({ where: { id: { not: id }, isActive: true }, select: { id: true } });
      for (const period of closing) await captureRosterSnapshot(tx, period.id);
      await tx.academicPeriod.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
      await tx.academicPeriod.update({ where: { id }, data: { isActive: true } });
    });
  }
}
