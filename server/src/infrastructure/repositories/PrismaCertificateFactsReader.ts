import { PrismaClient } from '@prisma/client';
import { CertificateFacts, CertificateFactsReader } from '@domain/repositories/CertificateFactsReader';

export class PrismaCertificateFactsReader implements CertificateFactsReader {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async factsFor(input: { assignmentId: string | null; periodId: string; tutorId: string }): Promise<CertificateFacts> {
    const [assignment, period, reports] = await Promise.all([
      input.assignmentId ? this.prisma.cycleTutorAssignment.findUnique({ where: { id: input.assignmentId }, select: { acceptanceStatus: true, respondedAt: true, cycle: true } }) : null,
      this.prisma.academicPeriod.findUnique({ where: { id: input.periodId }, select: { startDate: true, endDate: true } }),
      this.prisma.tutorSemesterReport.count({ where: { periodId: input.periodId, tutorId: input.tutorId } }),
    ]);
    // El día final del periodo entra completo.
    const sessionsHeld = period
      ? await this.prisma.session.count({
          where: {
            tutorId: input.tutorId,
            cancelledAt: null,
            scheduledAt: { gte: period.startDate, lt: new Date(period.endDate.getTime() + 24 * 3_600_000) },
            endsAt: { lte: this.now() },
          },
        })
      : 0;
    return {
      acceptance: assignment ? { status: assignment.acceptanceStatus, respondedAt: assignment.respondedAt, cycle: assignment.cycle } : null,
      sessionsHeld,
      semesterReportSubmitted: reports > 0,
    };
  }
}
