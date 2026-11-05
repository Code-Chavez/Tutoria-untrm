import { Prisma, PrismaClient } from '@prisma/client';
import {
  AssignmentNoticeState,
  DeclineNoticeAttempt,
  DeclineNoticeKind,
  DeclineNoticeRepository,
  DeclineNoticeStatus,
  DeclineNoticeTx,
  FinalDeclineNoticeStatus,
  NewResendAttempt,
  NoticeOperationTakenError,
  ResendReason,
} from '@domain/repositories/DeclineNoticeRepository';

type Row = Omit<DeclineNoticeAttempt, 'kind' | 'status' | 'reason'> & { kind: string; status: string; reason: string | null };

const toAttempt = (row: Row): DeclineNoticeAttempt => ({ ...row, kind: row.kind as DeclineNoticeKind, status: row.status as DeclineNoticeStatus, reason: row.reason as ResendReason | null });

const STALE_CODE = 'SIN_RESULTADO';

/** Pasa a INCIERTO los intentos en curso que superaron el margen y deja el resumen de la designación coherente. */
async function expireStale(tx: Prisma.TransactionClient, where: Prisma.DeclineNoticeAttemptWhereInput, cutoff: Date): Promise<DeclineNoticeAttempt[]> {
  const stale = await tx.declineNoticeAttempt.findMany({ where: { ...where, status: 'ENVIANDO', startedAt: { lt: cutoff } } });
  const expired: DeclineNoticeAttempt[] = [];
  for (const row of stale) {
    const { count } = await tx.declineNoticeAttempt.updateMany({ where: { id: row.id, status: 'ENVIANDO', startedAt: row.startedAt }, data: { status: 'INCIERTO', errorCode: STALE_CODE } });
    if (count !== 1) continue;
    await tx.cycleTutorAssignment.updateMany({ where: { declineNoticeAttemptId: row.id }, data: { declineNoticeStatus: 'INCIERTO' } });
    expired.push(toAttempt({ ...row, status: 'INCIERTO', errorCode: STALE_CODE }));
  }
  return expired;
}

class PrismaDeclineNoticeTx implements DeclineNoticeTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async state(assignmentId: string): Promise<AssignmentNoticeState | null> {
    const a = await this.tx.cycleTutorAssignment.findUnique({ where: { id: assignmentId } });
    if (!a) return null;
    const latest = a.declineNoticeAttemptId ? await this.tx.declineNoticeAttempt.findUnique({ where: { id: a.declineNoticeAttemptId } }) : null;
    return { assignmentId: a.id, acceptanceStatus: a.acceptanceStatus, tutorId: a.tutorId, respondedAt: a.respondedAt, latest: latest ? toAttempt(latest) : null };
  }

  async findByOperation(requestedById: string, operationId: string): Promise<DeclineNoticeAttempt | null> {
    const row = await this.tx.declineNoticeAttempt.findUnique({ where: { requestedById_operationId: { requestedById, operationId } } });
    return row ? toAttempt(row) : null;
  }

  expireStale(assignmentId: string, cutoff: Date): Promise<DeclineNoticeAttempt[]> {
    return expireStale(this.tx, { assignmentId }, cutoff);
  }

  async insertResend(data: NewResendAttempt): Promise<DeclineNoticeAttempt> {
    try {
      const row = await this.tx.declineNoticeAttempt.create({ data: { ...data, kind: 'REENVIO', status: 'EN_COLA' } });
      await this.tx.cycleTutorAssignment.update({ where: { id: data.assignmentId }, data: { declineNoticeStatus: 'EN_COLA', declineNoticeAttemptId: row.id } });
      return toAttempt(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new NoticeOperationTakenError();
      throw error;
    }
  }
}

export class PrismaDeclineNoticeRepository implements DeclineNoticeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  recordDecline(assignmentId: string, tutorId: string, declineReason: string, respondedAt: Date): Promise<DeclineNoticeAttempt> {
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.declineNoticeAttempt.create({ data: { assignmentId, kind: 'ORIGINAL', status: 'EN_COLA', tutorId, declinedAt: respondedAt } });
      await tx.cycleTutorAssignment.update({
        where: { id: assignmentId },
        data: {
          acceptanceStatus: 'RECHAZADA',
          respondedAt,
          acceptanceTokenHash: null,
          acceptanceExpiresAt: null,
          declineReason,
          availability: Prisma.DbNull,
          declineNoticeStatus: 'EN_COLA',
          declineNoticeAttemptId: attempt.id,
        },
      });
      return toAttempt(attempt);
    });
  }

  claim(attemptId: string, now: Date): Promise<DeclineNoticeAttempt | null> {
    return this.prisma.$transaction(async (tx) => {
      // El UPDATE condicionado decide: de dos tomas simultáneas (intento inmediato y procesador) solo una ve count = 1.
      const { count } = await tx.declineNoticeAttempt.updateMany({ where: { id: attemptId, status: 'EN_COLA' }, data: { status: 'ENVIANDO', startedAt: now } });
      if (count !== 1) return null;
      await tx.cycleTutorAssignment.updateMany({ where: { declineNoticeAttemptId: attemptId }, data: { declineNoticeStatus: 'ENVIANDO' } });
      const row = await tx.declineNoticeAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      return toAttempt(row);
    });
  }

  async setRecipient(attemptId: string, startedAt: Date, recipient: { userId: string; email: string }): Promise<void> {
    await this.prisma.declineNoticeAttempt.updateMany({ where: { id: attemptId, status: 'ENVIANDO', startedAt }, data: { recipientUserId: recipient.userId, recipientEmail: recipient.email } });
  }

  finish(attemptId: string, startedAt: Date, result: { status: FinalDeclineNoticeStatus; errorCode: string | null }, now: Date, notBefore: Date): Promise<DeclineNoticeAttempt | null> {
    return this.prisma.$transaction(async (tx) => {
      // Condicional: sigue ENVIANDO, es ese mismo intento y no venció el margen. Un resultado tardío no pisa un INCIERTO.
      const { count } = await tx.declineNoticeAttempt.updateMany({
        where: { id: attemptId, status: 'ENVIANDO', AND: [{ startedAt }, { startedAt: { gte: notBefore } }] },
        data: { status: result.status, errorCode: result.errorCode, finishedAt: now },
      });
      if (count !== 1) return null;
      await tx.cycleTutorAssignment.updateMany({ where: { declineNoticeAttemptId: attemptId }, data: { declineNoticeStatus: result.status } });
      return toAttempt(await tx.declineNoticeAttempt.findUniqueOrThrow({ where: { id: attemptId } }));
    });
  }

  async findQueued(limit: number): Promise<DeclineNoticeAttempt[]> {
    return (await this.prisma.declineNoticeAttempt.findMany({ where: { status: 'EN_COLA' }, orderBy: { createdAt: 'asc' }, take: limit })).map(toAttempt);
  }

  expireStale(cutoff: Date): Promise<DeclineNoticeAttempt[]> {
    return this.prisma.$transaction((tx) => expireStale(tx, {}, cutoff));
  }

  async findById(id: string): Promise<DeclineNoticeAttempt | null> {
    const row = await this.prisma.declineNoticeAttempt.findUnique({ where: { id } });
    return row ? toAttempt(row) : null;
  }

  async latestByAssignments(assignmentIds: string[]): Promise<Map<string, DeclineNoticeAttempt>> {
    if (assignmentIds.length === 0) return new Map();
    const assignments = await this.prisma.cycleTutorAssignment.findMany({ where: { id: { in: assignmentIds }, declineNoticeAttemptId: { not: null } }, select: { id: true, declineNoticeAttemptId: true } });
    const attempts = await this.prisma.declineNoticeAttempt.findMany({ where: { id: { in: assignments.map((a) => a.declineNoticeAttemptId as string) } } });
    const byId = new Map(attempts.map((a) => [a.id, toAttempt(a)]));
    return new Map(assignments.flatMap((a) => (byId.has(a.declineNoticeAttemptId as string) ? [[a.id, byId.get(a.declineNoticeAttemptId as string) as DeclineNoticeAttempt] as const] : [])));
  }

  reserve<T>(assignmentId: string, work: (tx: DeclineNoticeTx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        // Candado de la transacción, por designación: dos reenvíos simultáneos no se solapan. Nunca abarca el envío del correo.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`decline-notice|${assignmentId}`}, 0))`;
        return work(new PrismaDeclineNoticeTx(tx));
      },
      { timeout: 10_000 },
    );
  }
}
