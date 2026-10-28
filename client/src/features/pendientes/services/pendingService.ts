import axios from 'axios';
import { apiClient } from '@shared/services/apiClient';

export type PendingKind =
  | 'DESIGNATION_REJECTED'
  | 'ACCEPTANCE_EMAIL_FAILED'
  | 'DESIGNATION_NO_RESPONSE'
  | 'TUTOR_INACTIVE'
  | 'CYCLE_WITHOUT_TUTOR'
  | 'CANCELLED_SESSION_NO_FOLLOWUP';

/**
 * Estado del aviso por correo a la coordinación de un rechazo. Describe solo el envío del correo, nunca si alguien lo leyó.
 * SIN_REGISTRO = rechazo anterior al registro de avisos: no se sabe si se avisó.
 */
export type DeclineNoticeStatus = 'EN_COLA' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO' | 'INCIERTO' | 'SIN_DESTINATARIO' | 'DATOS_INCOMPLETOS' | 'OBSOLETO' | 'SIN_REGISTRO';

export interface DeclineNotice {
  status: DeclineNoticeStatus;
  attemptId: string | null;
  kind: 'ORIGINAL' | 'REENVIO' | null;
  at: string | null;
  recipientName: string | null;
  deliveryEnabled: boolean;
  canResend: boolean;
  needsConfirmation: boolean;
}

export interface PendingItem {
  kind: PendingKind;
  schoolId: string;
  schoolName: string;
  cycle: number | null;
  title: string;
  detail: string;
  since: string;
  link: string;
  /** Solo en DESIGNATION_REJECTED. */
  notice?: DeclineNotice;
}

export interface ResendInput {
  /** Identifica la intención: repetirla (p. ej. por perder la respuesta) no envía otro correo. */
  operationId: string;
  /** Intento anterior que se confirma reenviar (null = el rechazo sin registro previo). */
  confirmPrevious?: { attemptId: string | null };
}

export interface ResendOutcome {
  attempt: { id: string; status: DeclineNoticeStatus; kind: 'ORIGINAL' | 'REENVIO'; at: string; recipientName: string | null };
  replayed: boolean;
}

export interface PreviousAttempt {
  attemptId: string | null;
  status: DeclineNoticeStatus | null;
  at: string | null;
}

export type ResendConflict =
  | { code: 'CONFIRMATION_REQUIRED'; previous: PreviousAttempt }
  | { code: 'DECLINE_NOTICE_IN_FLIGHT' | 'DECLINE_NOTICE_ALREADY_SENT'; previous: PreviousAttempt }
  | { code: 'DECLINE_NOT_REJECTED' | 'NO_ENABLED_RECIPIENT' | 'DELIVERY_DISABLED' | 'OPERATION_ID_CONFLICT'; previous?: undefined };

const CONFLICT_CODES = ['CONFIRMATION_REQUIRED', 'DECLINE_NOTICE_IN_FLIGHT', 'DECLINE_NOTICE_ALREADY_SENT', 'DECLINE_NOT_REJECTED', 'NO_ENABLED_RECIPIENT', 'DELIVERY_DISABLED', 'OPERATION_ID_CONFLICT'];

/** El conflicto (409 o 422) que devuelve el servidor al reenviar, o null si el error es de otra clase. */
export function parseResendConflict(error: unknown): ResendConflict | null {
  if (!axios.isAxiosError(error) || (error.response?.status !== 409 && error.response?.status !== 422)) return null;
  const data = error.response.data as { code?: string; previous?: PreviousAttempt } | undefined;
  return data?.code && CONFLICT_CODES.includes(data.code) ? ({ code: data.code, previous: data.previous } as ResendConflict) : null;
}

/** Sin respuesta del servidor (red, tiempo agotado) o error 5xx: no se sabe si se registró; hay que conservar el identificador. */
export function isLostResponse(error: unknown): boolean {
  return !axios.isAxiosError(error) || !error.response || error.response.status >= 500;
}

export const pendingService = {
  /**
   * Reenvía SOLO el aviso a la coordinación (no toca el rechazo). 201 aceptado por el servidor de correo; 200 repetición o sin envío;
   * 202 resultado incierto o en curso; 502 no aceptado. Los conflictos llegan como 409 o 422 (ver `parseResendConflict`).
   */
  resendDeclineNotice: async (schoolId: string, cycle: number, input: ResendInput): Promise<ResendOutcome> => {
    const response = await apiClient.post<ResendOutcome>(`/schools/${schoolId}/cycle-tutors/${cycle}/decline-notice/resend`, input, { validateStatus: (s) => s === 200 || s === 201 || s === 202 || s === 502 });
    return response.data;
  },
  list: async (): Promise<PendingItem[]> => {
    const response = await apiClient.get<{ items: PendingItem[] }>('/institutional-pending');
    return response.data.items;
  },
};
