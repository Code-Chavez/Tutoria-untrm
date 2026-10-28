/**
 * Estado de un INTENTO de avisar a la coordinación del rechazo de un docente (LEV-R05). Describe solo el envío del correo.
 *  - EN_COLA: guardado, nunca se intentó (se recupera tras un reinicio).
 *  - ENVIANDO: un intento está en curso (si no deja resultado, pasa a INCIERTO; nunca se repite solo).
 *  - ENVIADO: el servidor de correo lo aceptó (no significa que alguien lo haya leído).
 *  - FALLIDO: se demostró que el servidor de correo no lo aceptó.
 *  - INCIERTO: no se puede saber si salió.
 *  - SIN_DESTINATARIO: no hay un destinatario habilitado (no se realizó el envío).
 *  - DATOS_INCOMPLETOS: faltan o son inconsistentes datos necesarios (escuela, periodo, docente); no se realizó el envío.
 *  - OBSOLETO: la designación cambió o ya no está rechazada; no se envió.
 */
export type DeclineNoticeStatus = 'EN_COLA' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO' | 'INCIERTO' | 'SIN_DESTINATARIO' | 'DATOS_INCOMPLETOS' | 'OBSOLETO';
export type DeclineNoticeKind = 'ORIGINAL' | 'REENVIO';
/** Por qué una persona pidió el reenvío (lo determina el sistema a partir del estado que vio, no un texto libre). */
export type ResendReason = 'REINTENTO_TRAS_FALLO' | 'CONFIRMADO_TRAS_INCIERTO' | 'SIN_REGISTRO_PREVIO' | 'REINTENTO_SIN_ENVIO';
export type FinalDeclineNoticeStatus = Exclude<DeclineNoticeStatus, 'EN_COLA' | 'ENVIANDO'>;

export interface DeclineNoticeAttempt {
  id: string;
  createdAt: Date;
  assignmentId: string;
  kind: DeclineNoticeKind;
  status: DeclineNoticeStatus;
  tutorId: string;
  declinedAt: Date;
  operationId: string | null;
  requestedById: string | null;
  reason: ResendReason | null;
  previousAttemptId: string | null;
  recipientUserId: string | null;
  recipientEmail: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorCode: string | null;
}

/** Resumen del aviso en la designación. */
export interface AssignmentNoticeState {
  assignmentId: string;
  acceptanceStatus: string;
  tutorId: string;
  respondedAt: Date | null;
  /** Último intento (null en los rechazos anteriores a esta función). */
  latest: DeclineNoticeAttempt | null;
}

export type NewResendAttempt = Pick<DeclineNoticeAttempt, 'assignmentId' | 'tutorId' | 'declinedAt' | 'operationId' | 'requestedById' | 'reason' | 'previousAttemptId'>;

/** Ya existe un intento con ese identificador de operación para esa persona (carrera entre dos peticiones iguales). */
export class NoticeOperationTakenError extends Error {
  constructor() {
    super('El identificador de la operación ya está guardado');
    this.name = 'NoticeOperationTakenError';
  }
}

/** Sección crítica de una designación (transacción corta con candado): nunca abarca el envío del correo. */
export interface DeclineNoticeTx {
  state(assignmentId: string): Promise<AssignmentNoticeState | null>;
  findByOperation(requestedById: string, operationId: string): Promise<DeclineNoticeAttempt | null>;
  /** Pasa a INCIERTO el intento en curso que superó el margen y deja el resumen coherente. */
  expireStale(assignmentId: string, cutoff: Date): Promise<DeclineNoticeAttempt[]>;
  /** Guarda el reenvío en cola y lo marca como último intento de la designación. */
  insertResend(data: NewResendAttempt): Promise<DeclineNoticeAttempt>;
}

export interface DeclineNoticeRepository {
  /**
   * Guarda el rechazo (estado, motivo y fecha) Y su aviso original EN_COLA en una sola operación atómica: no puede quedar un
   * rechazo sin aviso en cola ni un aviso sin rechazo. No espera ningún envío.
   */
  recordDecline(assignmentId: string, tutorId: string, declineReason: string, respondedAt: Date): Promise<DeclineNoticeAttempt>;
  /** Toma el intento si sigue EN_COLA (reserva atómica: de dos que lo pidan a la vez, uno solo lo obtiene). */
  claim(attemptId: string, now: Date): Promise<DeclineNoticeAttempt | null>;
  /** Anota a quién se intenta enviar, antes de enviar (así queda constancia aunque el proceso muera durante el envío). */
  setRecipient(attemptId: string, startedAt: Date, recipient: { userId: string; email: string }): Promise<void>;
  /** Registra el resultado solo si el intento sigue vigente (ENVIANDO, el mismo y dentro del margen). Null si no. */
  finish(attemptId: string, startedAt: Date, result: { status: FinalDeclineNoticeStatus; errorCode: string | null }, now: Date, notBefore: Date): Promise<DeclineNoticeAttempt | null>;
  /** Intentos EN_COLA más antiguos primero. */
  findQueued(limit: number): Promise<DeclineNoticeAttempt[]>;
  /** Pasa a INCIERTO los ENVIANDO que superaron el margen (un proceso que murió durante el envío). */
  expireStale(cutoff: Date): Promise<DeclineNoticeAttempt[]>;
  findById(id: string): Promise<DeclineNoticeAttempt | null>;
  /** Último intento por designación (según el resumen de la designación). */
  latestByAssignments(assignmentIds: string[]): Promise<Map<string, DeclineNoticeAttempt>>;
  reserve<T>(assignmentId: string, work: (tx: DeclineNoticeTx) => Promise<T>): Promise<T>;
}
