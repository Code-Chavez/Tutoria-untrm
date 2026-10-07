import { PrismaClient, Prisma } from '@prisma/client';
import {
  WorkPlan,
  WorkPlanContent,
  WorkPlanResolutionFile,
  WorkPlanVersion,
} from '@domain/entities/WorkPlan';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';

// Las tablas del anexo se guardan como Json; el cast satisface a Prisma, la
// forma ya fue validada por Zod en el borde HTTP.
function toPrismaData(content: WorkPlanContent) {
  return {
    ...content,
    planning: content.planning as unknown as Prisma.InputJsonValue,
    programming: content.programming as unknown as Prisma.InputJsonValue,
    physicalResources: content.physicalResources as unknown as Prisma.InputJsonValue,
    humanResources: content.humanResources as unknown as Prisma.InputJsonValue,
    budget: content.budget as unknown as Prisma.InputJsonValue,
    operationalActivities: content.operationalActivities as unknown as Prisma.InputJsonValue,
  };
}

// Se trae solo la revisión de la última versión aprobada archivada.
const WITH_LAST_APPROVED = {
  versions: { select: { revision: true }, orderBy: { revision: 'desc' }, take: 1 },
} as const satisfies Prisma.WorkPlanInclude;

type PlanRow = Prisma.WorkPlanGetPayload<{ include: typeof WITH_LAST_APPROVED }>;

// Las columnas Json de Prisma llegan como JsonValue; el contrato de forma lo
// garantiza el validador Zod que las escribe.
function toWorkPlan({ versions, ...row }: PlanRow): WorkPlan {
  return { ...row, lastApprovedRevision: versions[0]?.revision ?? null } as unknown as WorkPlan;
}

function toVersion(row: unknown): WorkPlanVersion {
  return row as WorkPlanVersion;
}

export class PrismaWorkPlanRepository implements WorkPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPeriodAndSchool(periodId: string, schoolId: string): Promise<WorkPlan | null> {
    const row = await this.prisma.workPlan.findUnique({
      where: { periodId_schoolId: { periodId, schoolId } },
      include: WITH_LAST_APPROVED,
    });
    return row ? toWorkPlan(row) : null;
  }

  async findAllByPeriod(periodId: string): Promise<WorkPlan[]> {
    const rows = await this.prisma.workPlan.findMany({ where: { periodId }, include: WITH_LAST_APPROVED });
    return rows.map(toWorkPlan);
  }

  async saveContent(
    periodId: string,
    schoolId: string,
    authorId: string,
    content: WorkPlanContent,
  ): Promise<WorkPlan> {
    const id = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.workPlan.findUnique({ where: { periodId_schoolId: { periodId, schoolId } } });

      if (!existing) {
        return (await tx.workPlan.create({ data: { periodId, schoolId, authorId, ...toPrismaData(content) } })).id;
      }

      if (!existing.resolutionStorageKey) {
        // Sin aprobar: se edita en el sitio, pero solo si sigue sin resolución (otra petición
        // pudo adjuntarla entre la lectura y la escritura); si no, se trata como aprobado.
        const { count } = await tx.workPlan.updateMany({
          where: { id: existing.id, resolutionStorageKey: null },
          data: { authorId, ...toPrismaData(content) },
        });
        if (count === 1) return existing.id;
      }

      // Aprobado: se conserva la versión aprobada tal cual y el contenido nuevo abre otra revisión.
      const approved = (await tx.workPlan.findUnique({ where: { id: existing.id } }))!;
      const { id: _id, createdAt: _c, updatedAt: _u, periodId: _p, schoolId: _s, revision, ...snapshot } = approved;
      await tx.workPlanVersion.create({
        data: {
          workPlanId: approved.id,
          revision,
          authorId: approved.authorId,
          content: pickContent(snapshot) as unknown as Prisma.InputJsonValue,
          resolutionFileName: approved.resolutionFileName as string,
          resolutionFileSize: approved.resolutionFileSize as number,
          resolutionStorageKey: approved.resolutionStorageKey as string,
          resolutionUploadedAt: approved.resolutionUploadedAt as Date,
        },
      });
      await tx.workPlan.update({
        where: { id: approved.id },
        data: {
          authorId,
          ...toPrismaData(content),
          revision: revision + 1,
          resolutionFileName: null,
          resolutionFileSize: null,
          resolutionStorageKey: null,
          resolutionUploadedAt: null,
        },
      });
      return approved.id;
    });

    const row = await this.prisma.workPlan.findUnique({ where: { id }, include: WITH_LAST_APPROVED });
    return toWorkPlan(row as PlanRow);
  }

  async setResolution(planId: string, file: WorkPlanResolutionFile): Promise<WorkPlan> {
    const row = await this.prisma.workPlan.update({
      where: { id: planId },
      data: {
        resolutionFileName: file.fileName,
        resolutionFileSize: file.fileSize,
        resolutionStorageKey: file.storageKey,
        resolutionUploadedAt: new Date(),
      },
      include: WITH_LAST_APPROVED,
    });
    return toWorkPlan(row);
  }

  async findVersions(planId: string): Promise<WorkPlanVersion[]> {
    const rows = await this.prisma.workPlanVersion.findMany({
      where: { workPlanId: planId },
      orderBy: { revision: 'desc' },
    });
    return rows.map(toVersion);
  }

  async findVersion(planId: string, revision: number): Promise<WorkPlanVersion | null> {
    const row = await this.prisma.workPlanVersion.findUnique({
      where: { workPlanId_revision: { workPlanId: planId, revision } },
    });
    return row ? toVersion(row) : null;
  }
}

/** Extrae del plan solo los campos del contenido del Anexo N°8 (lo que se congela en la versión). */
function pickContent(plan: Record<string, unknown>): WorkPlanContent {
  const keys: (keyof WorkPlanContent)[] = [
    'introduction', 'denomination', 'eventType', 'executionDate', 'schedule', 'place', 'modality',
    'organizers', 'supportUnit', 'foundation', 'generalObjective', 'specificObjectives', 'targetAudience',
    'methodology', 'planning', 'programming', 'physicalResources', 'humanResources', 'budget', 'operationalActivities',
  ];
  return Object.fromEntries(keys.map((k) => [k, plan[k]])) as unknown as WorkPlanContent;
}
