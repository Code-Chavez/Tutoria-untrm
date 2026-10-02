import { PrismaClient, Prisma } from '@prisma/client';
import { WorkPlan, WorkPlanContent } from '@domain/entities/WorkPlan';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';

// Las columnas Json de Prisma llegan como JsonValue; el contrato de forma lo
// garantiza el validador Zod que las escribe.
function toWorkPlan(row: unknown): WorkPlan {
  return row as WorkPlan;
}

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

export class PrismaWorkPlanRepository implements WorkPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPeriodAndSchool(periodId: string, schoolId: string): Promise<WorkPlan | null> {
    const row = await this.prisma.workPlan.findUnique({
      where: { periodId_schoolId: { periodId, schoolId } },
    });
    return row ? toWorkPlan(row) : null;
  }

  async findAllByPeriod(periodId: string): Promise<WorkPlan[]> {
    const rows = await this.prisma.workPlan.findMany({ where: { periodId } });
    return rows.map(toWorkPlan);
  }

  async upsert(
    periodId: string,
    schoolId: string,
    authorId: string,
    content: WorkPlanContent,
  ): Promise<WorkPlan> {
    const row = await this.prisma.workPlan.upsert({
      where: { periodId_schoolId: { periodId, schoolId } },
      update: toPrismaData(content),
      create: { periodId, schoolId, authorId, ...toPrismaData(content) },
    });
    return toWorkPlan(row);
  }
}
