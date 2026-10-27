import { createHash } from 'node:crypto';
import { DataRequest, DataRequestKind } from '@domain/repositories/DataRequestRepository';

/**
 * Ventana en la que un pedido equivalente a uno ya hecho pide confirmación explícita (LEV-R04).
 * VALOR PROVISIONAL DEL PROYECTO: lo fijó el responsable del proyecto para trabajar; NO es una política institucional aprobada
 * y puede cambiarse sin más trámite que actualizar esta constante y la especificación.
 */
export const DATA_REQUEST_DUPLICATE_WINDOW_MINUTES = 10;
export const DATA_REQUEST_DUPLICATE_WINDOW_MS = DATA_REQUEST_DUPLICATE_WINDOW_MINUTES * 60_000;

/**
 * Margen de un intento de envío: pasado este tiempo sin resultado, el pedido PENDIENTE se trata como INCIERTO y un resultado que
 * llegue tarde ya no lo modifica. Es el mismo margen de reserva que usa la cola de avisos (LEASE_MS, 5 min).
 */
export const DATA_REQUEST_ATTEMPT_MARGIN_MS = 5 * 60_000;

/**
 * Tiempo máximo que se ESPERA un envío SMTP. Es mucho menor que el margen, de modo que el resultado (éxito, fallo o INCIERTO) se
 * registra mucho antes de que otro proceso pueda considerar vencido el intento.
 * IMPORTANTE: vencer este plazo NO cancela el transporte SMTP (sigue hasta sus propios tiempos de espera y puede terminar el envío
 * después) y NO prueba que el correo no salió: por eso el resultado es INCIERTO.
 */
export const DATA_REQUEST_SEND_TIMEOUT_MS = 60_000;

/** Un PENDIENTE cuyo intento superó el margen se trata como INCIERTO aunque nadie lo haya reescrito todavía. */
export function withEffectiveStatus(request: DataRequest, now: Date): DataRequest {
  const expired = request.status === 'PENDIENTE' && request.attemptStartedAt !== null && request.attemptStartedAt.getTime() < now.getTime() - DATA_REQUEST_ATTEMPT_MARGIN_MS;
  return expired ? { ...request, status: 'INCIERTO', error: 'SIN_RESULTADO' } : request;
}

/**
 * Alcance de un pedido para detectar equivalentes. Docentes: los ciclos no aplican. Estudiantes: ningún ciclo («todos», como dice
 * el correo y la lista) y la lista completa de ciclos de la escuela son el mismo alcance; si no, los ciclos sin repetir y ordenados.
 */
export function cyclesScope(kind: DataRequestKind, cycles: number[], cycleCount: number | null | undefined): string {
  if (kind === 'DOCENTES') return 'NA';
  const sorted = [...new Set(cycles)].sort((a, b) => a - b);
  const total = cycleCount ?? 0;
  const isAll = sorted.length === 0 || (total > 0 && sorted.length === total && sorted.every((c, i) => c === i + 1));
  return isAll ? 'ALL' : sorted.join(',');
}

export function equivalenceKey(parts: { kind: DataRequestKind; schoolId: string; periodId: string; scope: string }): string {
  return `${parts.kind}|${parts.schoolId}|${parts.periodId}|${parts.scope}`;
}

/** Resumen de lo que efectivamente se envía: destinatario, nota, ciclos, tipo, escuela y periodo. */
export function contentHash(parts: { kind: DataRequestKind; schoolId: string; periodId: string; toEmail: string; cycles: number[]; note: string | null }): string {
  const canonical = JSON.stringify([parts.kind, parts.schoolId, parts.periodId, parts.toEmail.trim().toLowerCase(), [...parts.cycles], parts.note]);
  return createHash('sha256').update(canonical).digest('hex');
}
