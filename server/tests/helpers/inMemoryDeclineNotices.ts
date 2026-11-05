import {
  AssignmentNoticeState,
  DeclineNoticeAttempt,
  DeclineNoticeRepository,
  DeclineNoticeTx,
  FinalDeclineNoticeStatus,
  NewResendAttempt,
  NoticeOperationTakenError,
} from '@domain/repositories/DeclineNoticeRepository';
import { CycleTutorAssignment } from '@domain/repositories/CycleTutorRepository';

export interface StoredAssignment extends CycleTutorAssignment {
  declineNoticeStatus: string | null;
  declineNoticeAttemptId: string | null;
}

/**
 * Mundo en memoria para las pruebas unitarias del aviso de rechazo: designaciones, intentos y las secciones críticas. Reproduce lo
 * que importa del repositorio real: `recordDecline` es atómico, `claim` lo gana uno solo, `finish` es condicional, las secciones
 * críticas de una misma designación se atienden una tras otra y una que lanza no deja cambios.
 */
export class InMemoryDeclineNotices implements DeclineNoticeRepository {
  assignments = new Map<string, StoredAssignment>();
  attempts: DeclineNoticeAttempt[] = [];
  private seq = 0;
  private readonly chains = new Map<string, Promise<unknown>>();
  /** Transacciones abiertas ahora (debe ser 0 mientras se envía el correo). */
  activeTransactions = 0;

  addAssignment(over: Partial<StoredAssignment> & { id: string }): StoredAssignment {
    const a: StoredAssignment = {
      periodId: 'p1',
      schoolId: 's1',
      cycle: 3,
      tutorId: 't1',
      isException: false,
      assignedById: 'u0',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      acceptanceStatus: 'PENDIENTE',
      declineNoticeStatus: null,
      declineNoticeAttemptId: null,
      respondedAt: null,
      declineReason: null,
      ...over,
    };
    this.assignments.set(a.id, a);
    return a;
  }

  private nextId() {
    this.seq += 1;
    return `n${this.seq}`;
  }

  async recordDecline(assignmentId: string, tutorId: string, declineReason: string, respondedAt: Date): Promise<DeclineNoticeAttempt> {
    const a = this.assignments.get(assignmentId);
    if (!a) throw new Error('designación inexistente');
    const attempt: DeclineNoticeAttempt = {
      id: this.nextId(),
      createdAt: respondedAt,
      assignmentId,
      kind: 'ORIGINAL',
      status: 'EN_COLA',
      tutorId,
      declinedAt: respondedAt,
      operationId: null,
      requestedById: null,
      reason: null,
      previousAttemptId: null,
      recipientUserId: null,
      recipientEmail: null,
      startedAt: null,
      finishedAt: null,
      errorCode: null,
    };
    this.attempts.push(attempt);
    Object.assign(a, { acceptanceStatus: 'RECHAZADA', respondedAt, declineReason, declineNoticeStatus: 'EN_COLA', declineNoticeAttemptId: attempt.id });
    return { ...attempt };
  }

  async claim(attemptId: string, now: Date): Promise<DeclineNoticeAttempt | null> {
    const a = this.attempts.find((x) => x.id === attemptId);
    if (!a || a.status !== 'EN_COLA') return null;
    a.status = 'ENVIANDO';
    a.startedAt = now;
    this.mirror(attemptId, 'ENVIANDO');
    return { ...a };
  }

  async setRecipient(attemptId: string, startedAt: Date, recipient: { userId: string; email: string }): Promise<void> {
    const a = this.attempts.find((x) => x.id === attemptId);
    if (a && a.status === 'ENVIANDO' && a.startedAt?.getTime() === startedAt.getTime()) Object.assign(a, { recipientUserId: recipient.userId, recipientEmail: recipient.email });
  }

  async finish(attemptId: string, startedAt: Date, result: { status: FinalDeclineNoticeStatus; errorCode: string | null }, now: Date, notBefore: Date): Promise<DeclineNoticeAttempt | null> {
    const a = this.attempts.find((x) => x.id === attemptId);
    if (!a || a.status !== 'ENVIANDO' || !a.startedAt || a.startedAt.getTime() !== startedAt.getTime() || a.startedAt < notBefore) return null;
    Object.assign(a, { status: result.status, errorCode: result.errorCode, finishedAt: now });
    this.mirror(attemptId, result.status);
    return { ...a };
  }

  async findQueued(limit: number): Promise<DeclineNoticeAttempt[]> {
    return this.attempts.filter((a) => a.status === 'EN_COLA').slice(0, limit).map((a) => ({ ...a }));
  }

  async expireStale(cutoff: Date): Promise<DeclineNoticeAttempt[]> {
    return this.expire(this.attempts, cutoff);
  }

  private expire(list: DeclineNoticeAttempt[], cutoff: Date): DeclineNoticeAttempt[] {
    const expired: DeclineNoticeAttempt[] = [];
    for (const a of list) {
      if (a.status === 'ENVIANDO' && a.startedAt && a.startedAt < cutoff) {
        a.status = 'INCIERTO';
        a.errorCode = 'SIN_RESULTADO';
        this.mirror(a.id, 'INCIERTO');
        expired.push({ ...a });
      }
    }
    return expired;
  }

  async findById(id: string): Promise<DeclineNoticeAttempt | null> {
    const a = this.attempts.find((x) => x.id === id);
    return a ? { ...a } : null;
  }

  async latestByAssignments(ids: string[]): Promise<Map<string, DeclineNoticeAttempt>> {
    const map = new Map<string, DeclineNoticeAttempt>();
    for (const id of ids) {
      const latestId = this.assignments.get(id)?.declineNoticeAttemptId;
      const a = latestId ? this.attempts.find((x) => x.id === latestId) : undefined;
      if (a) map.set(id, { ...a });
    }
    return map;
  }

  async reserve<T>(assignmentId: string, work: (tx: DeclineNoticeTx) => Promise<T>): Promise<T> {
    const previous = this.chains.get(assignmentId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(async () => {
      this.activeTransactions += 1;
      const snapshot = JSON.stringify([[...this.assignments.entries()], this.attempts]);
      const restore = () => {
        const [assignments, attempts] = JSON.parse(snapshot, (_k, v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v));
        this.assignments = new Map(assignments);
        this.attempts = attempts;
      };
      try {
        return await work(this.tx());
      } catch (error) {
        restore();
        throw error;
      } finally {
        this.activeTransactions -= 1;
      }
    });
    this.chains.set(assignmentId, run.catch(() => undefined));
    return run;
  }

  private tx(): DeclineNoticeTx {
    return {
      state: async (assignmentId): Promise<AssignmentNoticeState | null> => {
        const a = this.assignments.get(assignmentId);
        if (!a) return null;
        const latest = this.attempts.find((x) => x.id === a.declineNoticeAttemptId);
        return { assignmentId: a.id, acceptanceStatus: a.acceptanceStatus, tutorId: a.tutorId, respondedAt: a.respondedAt ?? null, latest: latest ? { ...latest } : null };
      },
      findByOperation: async (requestedById, operationId) => {
        const a = this.attempts.find((x) => x.requestedById === requestedById && x.operationId === operationId);
        return a ? { ...a } : null;
      },
      expireStale: async (assignmentId, cutoff) => this.expire(this.attempts.filter((a) => a.assignmentId === assignmentId), cutoff),
      insertResend: async (data: NewResendAttempt) => {
        if (data.operationId && this.attempts.some((x) => x.requestedById === data.requestedById && x.operationId === data.operationId)) throw new NoticeOperationTakenError();
        const attempt: DeclineNoticeAttempt = {
          id: this.nextId(),
          createdAt: new Date(),
          kind: 'REENVIO',
          status: 'EN_COLA',
          recipientUserId: null,
          recipientEmail: null,
          startedAt: null,
          finishedAt: null,
          errorCode: null,
          ...data,
        };
        this.attempts.push(attempt);
        const a = this.assignments.get(data.assignmentId);
        if (a) Object.assign(a, { declineNoticeStatus: 'EN_COLA', declineNoticeAttemptId: attempt.id });
        return { ...attempt };
      },
    };
  }

  private mirror(attemptId: string, status: string) {
    for (const a of this.assignments.values()) if (a.declineNoticeAttemptId === attemptId) a.declineNoticeStatus = status;
  }
}
