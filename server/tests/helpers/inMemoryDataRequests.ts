import {
  DataRequest,
  DataRequestRepository,
  DataRequestStatus,
  DataRequestTx,
  NewDataRequest,
  OperationIdTakenError,
} from '@domain/repositories/DataRequestRepository';

/**
 * Repositorio de pedidos en memoria para las pruebas unitarias. Reproduce lo que importa del real: las secciones críticas de una
 * misma clave se atienden una tras otra (el candado), una transacción que lanza no deja cambios (se revierte) y el resultado de
 * un intento solo se acepta si sigue vigente. Las filas se pueden inspeccionar en `rows`.
 */
export class InMemoryDataRequests implements DataRequestRepository {
  rows: DataRequest[] = [];
  private seq = 0;
  private readonly chains = new Map<string, Promise<unknown>>();
  /** Para simular una caída entre el envío y el registro del resultado. */
  failNextFinish = false;
  activeTransactions = 0;

  async reserve<T>(equivalenceKey: string, work: (tx: DataRequestTx) => Promise<T>): Promise<T> {
    const previous = this.chains.get(equivalenceKey) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(async () => {
      this.activeTransactions += 1;
      const snapshot = this.rows.map((r) => ({ ...r }));
      try {
        return await work(this.tx());
      } catch (error) {
        this.rows = snapshot;
        throw error;
      } finally {
        this.activeTransactions -= 1;
      }
    });
    this.chains.set(equivalenceKey, run.catch(() => undefined));
    return run;
  }

  private tx(): DataRequestTx {
    return {
      findByOperation: async (requestedById, operationId) => this.rows.find((r) => r.requestedById === requestedById && r.operationId === operationId) ?? null,
      expireStalePending: async (key, cutoff) => {
        for (const r of this.rows) {
          if (r.equivalenceKey === key && r.status === 'PENDIENTE' && r.attemptStartedAt && r.attemptStartedAt < cutoff) {
            r.status = 'INCIERTO';
            r.error = 'SIN_RESULTADO';
          }
        }
      },
      findLatestCounting: async (key, since) =>
        [...this.rows]
          .filter((r) => r.equivalenceKey === key && r.createdAt >= since && (['PENDIENTE', 'ENVIADO', 'INCIERTO'] as DataRequestStatus[]).includes(r.status))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      insertPending: async (data: NewDataRequest) => {
        if (data.operationId && this.rows.some((r) => r.requestedById === data.requestedById && r.operationId === data.operationId)) throw new OperationIdTakenError();
        this.seq += 1;
        const row: DataRequest = { id: `r${this.seq}`, createdAt: data.attemptStartedAt ?? new Date(), receivedAt: null, receivedById: null, status: 'PENDIENTE', error: null, ...data };
        this.rows.push(row);
        return { ...row };
      },
    };
  }

  async finishAttempt(id: string, attemptStartedAt: Date, result: { status: 'ENVIADO' | 'FALLIDO' | 'INCIERTO'; error: string | null }, notBefore: Date): Promise<DataRequest | null> {
    if (this.failNextFinish) {
      this.failNextFinish = false;
      throw new Error('caída antes de registrar el resultado');
    }
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.status !== 'PENDIENTE' || !row.attemptStartedAt || row.attemptStartedAt.getTime() !== attemptStartedAt.getTime() || row.attemptStartedAt < notBefore) return null;
    row.status = result.status;
    row.error = result.error;
    return { ...row };
  }

  async list(): Promise<DataRequest[]> {
    return [...this.rows].reverse();
  }

  async findById(id: string): Promise<DataRequest | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? { ...row } : null;
  }

  async markReceived(id: string, byId: string, at: Date): Promise<DataRequest | null> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    row.receivedAt = at;
    row.receivedById = byId;
    return { ...row };
  }
}
