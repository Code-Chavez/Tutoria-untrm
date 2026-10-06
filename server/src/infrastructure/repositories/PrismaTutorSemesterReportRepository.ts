import { PrismaClient, Prisma } from '@prisma/client';
import {
  TutorSemesterReport,
  TutorSemesterReportContent,
} from '@domain/entities/TutorSemesterReport';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';

// Las tablas del anexo se guardan como Json; su forma la garantiza el
// validador Zod en el borde HTTP.
function toReport(row: unknown): TutorSemesterReport {
  return row as TutorSemesterReport;
}

function toPrismaData(content: TutorSemesterReportContent) {
  return {
    ...content,
    individual: content.individual as unknown as Prisma.InputJsonValue,
    group: content.group as unknown as Prisma.InputJsonValue,
  };
}

export class PrismaTutorSemesterReportRepository implements TutorSemesterReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByPeriodAndTutor(periodId: string, tutorId: string): Promise<TutorSemesterReport | null> {
    const row = await this.prisma.tutorSemesterReport.findUnique({
      where: { periodId_tutorId: { periodId, tutorId } },
    });
    return row ? toReport(row) : null;
  }

  async findAllByPeriod(periodId: string): Promise<TutorSemesterReport[]> {
    const rows = await this.prisma.tutorSemesterReport.findMany({ where: { periodId } });
    return rows.map(toReport);
  }

  async upsert(
    periodId: string,
    tutorId: string,
    content: TutorSemesterReportContent,
  ): Promise<TutorSemesterReport> {
    const row = await this.prisma.tutorSemesterReport.upsert({
      where: { periodId_tutorId: { periodId, tutorId } },
      update: toPrismaData(content),
      create: { periodId, tutorId, ...toPrismaData(content) },
    });
    return toReport(row);
  }
}
