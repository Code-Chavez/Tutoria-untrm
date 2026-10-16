import { PrismaClient } from '@prisma/client';
import { PeriodSummary, PeriodSummaryRepository } from '@domain/repositories/PeriodSummaryRepository';

const DAY_MS = 24 * 60 * 60_000;
const OPEN_REQUEST = ['PENDIENTE', 'EN_ATENCION'];
const CLOSED_REFERRAL = ['ATENDIDO', 'CERRADO'];

/** Resumen de un periodo a partir de sus fechas (el último día entra completo) y de sus propios registros. Solo conteos. */
export class PrismaPeriodSummaryRepository implements PeriodSummaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async summarize(period: { id: string; startDate: Date; endDate: Date }, now: Date): Promise<PeriodSummary> {
    const within = { gte: period.startDate, lt: new Date(period.endDate.getTime() + DAY_MS) };

    // Un periodo ya cerrado se lee de su corte de matrícula; uno vigente, de la matrícula actual.
    const snapshots = await this.prisma.studentPeriodSnapshot.findMany({ where: { periodId: period.id }, select: { tutorId: true, isActive: true, isAtRisk: true } });
    // Con matrícula del periodo, el resumen cuenta a los matriculados; sin ella, a todos los estudiantes.
    const enrolledIds = snapshots.length > 0 ? [] : (await this.prisma.periodEnrollment.findMany({ where: { periodId: period.id }, select: { studentId: true } })).map((e) => e.studentId);
    const roster =
      snapshots.length > 0
        ? snapshots
        : await this.prisma.student.findMany({
            ...(enrolledIds.length > 0 ? { where: { id: { in: enrolledIds } } } : {}),
            select: { tutorId: true, isActive: true, isAtRisk: true },
          });

    const [sessions, withAttendance, cancelled, requests, openRequests, referrals, openReferrals, upcoming, evaluations, reports] = await Promise.all([
      this.prisma.session.count({ where: { scheduledAt: within } }),
      this.prisma.session.count({ where: { scheduledAt: within, attendance: { isNot: null } } }),
      this.prisma.session.count({ where: { scheduledAt: within, cancelledAt: { not: null } } }),
      this.prisma.tutoringRequest.count({ where: { createdAt: within } }),
      this.prisma.tutoringRequest.count({ where: { createdAt: within, status: { in: OPEN_REQUEST } } }),
      this.prisma.studentReferral.count({ where: { createdAt: within } }),
      this.prisma.studentReferral.count({ where: { createdAt: within, status: { notIn: CLOSED_REFERRAL } } }),
      this.prisma.session.count({ where: { scheduledAt: { gt: now, lt: within.lt }, cancelledAt: null } }),
      this.prisma.tutorEvaluation.count({ where: { periodId: period.id } }),
      this.prisma.tutorSemesterReport.count({ where: { periodId: period.id } }),
    ]);

    // Individual = una sola persona participante; grupal = dos o más (Art. 7).
    const participantCounts = await this.prisma.sessionParticipant.groupBy({ by: ['sessionId'], where: { session: { scheduledAt: within } }, _count: { _all: true } });
    const groupSessions = participantCounts.filter((p) => p._count._all >= 2).length;

    return {
      students: { total: roster.length, active: roster.filter((s) => s.isActive).length, atRisk: roster.filter((s) => s.isAtRisk).length },
      tutors: new Set(roster.map((s) => s.tutorId).filter(Boolean)).size,
      sessions: { total: sessions, individual: sessions - groupSessions, group: groupSessions, cancelled, withAttendance },
      referrals: { total: referrals, open: openReferrals },
      tutoringRequests: { total: requests, open: openRequests },
      evaluations: { responses: evaluations },
      semesterReports: { submitted: reports },
      pending: { openRequests, openReferrals, upcomingSessions: upcoming },
    };
  }
}
