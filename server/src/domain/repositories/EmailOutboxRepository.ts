import { Notification } from '../entities/Notification';

export interface OutboxItem {
  id: string;
  attempts: number;
  notification: Notification;
}

/** Cola de entrega del correo de los avisos (A10). Cada aviso tiene como máximo una entrada. */
export interface EmailOutboxRepository {
  enqueue(notificationId: string): Promise<void>;
  /**
   * Toma, de forma atómica, las entradas pendientes cuyo momento llegó. «Tomar» las aparta por `leaseMs`: si el proceso
   * muere a mitad del envío, vuelven a quedar disponibles después; dos procesos nunca toman la misma.
   */
  claimDue(now: Date, limit: number, leaseMs: number): Promise<OutboxItem[]>;
  /** Igual para el aviso recién creado (intento inmediato). Devuelve null si ya la tomó otro o ya no está pendiente. */
  claimForNotification(notificationId: string, now: Date, leaseMs: number): Promise<OutboxItem | null>;
  markSent(id: string, at: Date): Promise<void>;
  /** `nextAttemptAt` nulo = no se reintenta más (FAILED). */
  markFailed(id: string, attempts: number, error: string, nextAttemptAt: Date | null): Promise<void>;
  markSkipped(id: string, reason: string): Promise<void>;
  /** Para vigilar la entrega: cuántas hay por estado. */
  countByStatus(): Promise<Record<string, number>>;
}
