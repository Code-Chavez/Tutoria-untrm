/**
 * Estado del ENVÍO del pedido, separado de lo que pasa después con la lista (recepción, revisión, carga):
 *  - PENDIENTE: guardado, con un intento de envío en curso.
 *  - ENVIADO: el servidor de correo lo aceptó (no significa que llegó a la bandeja).
 *  - FALLIDO: se demostró que el servidor de correo no lo aceptó; se puede reenviar sin más trámite.
 *  - INCIERTO: no se puede saber si el correo salió (p. ej. se agotó el tiempo al transmitirlo, o el intento no dejó resultado).
 */
export type DataRequestStatus = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'INCIERTO';
export type DataRequestKind = 'ESTUDIANTES' | 'DOCENTES';

export interface DataRequest {
  id: string;
  createdAt: Date;
  periodId: string;
  schoolId: string;
  kind: DataRequestKind;
  toEmail: string;
  cycles: number[];
  note: string | null;
  requestedById: string;
  status: DataRequestStatus;
  error: string | null;
  receivedAt: Date | null;
  receivedById: string | null;
  /** Nulos en los pedidos anteriores a la idempotencia. */
  operationId: string | null;
  contentHash: string | null;
  equivalenceKey: string | null;
  resendOfId: string | null;
  attemptStartedAt: Date | null;
}

export type NewDataRequest = Pick<DataRequest, 'periodId' | 'schoolId' | 'kind' | 'toEmail' | 'cycles' | 'note' | 'requestedById' | 'operationId' | 'contentHash' | 'equivalenceKey' | 'resendOfId' | 'attemptStartedAt'>;

/** Otro intento ya guardó ese identificador de operación para la misma persona (carrera entre dos peticiones iguales). */
export class OperationIdTakenError extends Error {
  constructor() {
    super('El identificador de la operación ya está guardado');
    this.name = 'OperationIdTakenError';
  }
}

/** Operaciones dentro de la sección crítica de una clave de equivalencia (una transacción corta con candado). */
export interface DataRequestTx {
  findByOperation(requestedById: string, operationId: string): Promise<DataRequest | null>;
  /** Pasa a INCIERTO los PENDIENTE de esa clave cuyo intento empezó antes de `cutoff`. */
  expireStalePending(equivalenceKey: string, cutoff: Date): Promise<void>;
  /** El pedido más reciente, desde `since`, que cuenta para advertir: PENDIENTE, ENVIADO o INCIERTO (no FALLIDO). */
  findLatestCounting(equivalenceKey: string, since: Date): Promise<DataRequest | null>;
  /** Guarda el pedido como PENDIENTE. Lanza OperationIdTakenError si ese identificador ya existe para esa persona. */
  insertPending(data: NewDataRequest): Promise<DataRequest>;
}

export interface DataRequestRepository {
  /**
   * Ejecuta `work` en una transacción corta con un candado por clave de equivalencia: dos peticiones con la misma clave no se
   * solapan. La transacción NO debe abarcar el envío del correo.
   */
  reserve<T>(equivalenceKey: string, work: (tx: DataRequestTx) => Promise<T>): Promise<T>;
  /**
   * Registra el resultado del intento solo si sigue vigente: el pedido está PENDIENTE, es ese mismo intento y no pasó el margen
   * (`notBefore`). Devuelve null si no (p. ej. ya quedó INCIERTO): un resultado tardío no pisa ese estado.
   */
  finishAttempt(id: string, attemptStartedAt: Date, result: { status: 'ENVIADO' | 'FALLIDO' | 'INCIERTO'; error: string | null }, notBefore: Date): Promise<DataRequest | null>;
  /** Más recientes primero. Con `schoolIds` solo las de esas escuelas. */
  list(filters?: { schoolIds?: string[]; periodId?: string }): Promise<DataRequest[]>;
  findById(id: string): Promise<DataRequest | null>;
  markReceived(id: string, byId: string, at: Date): Promise<DataRequest | null>;
}
