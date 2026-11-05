// Notificación de derivación (HU-33).
export type NotificationType =
  | 'REFERRAL_CREATED'
  | 'REFERRAL_STATUS_CHANGED'
  | 'TUTORING_REQUEST_CREATED'
  | 'TUTORING_REQUEST_UPDATED'
  | 'TUTORING_REQUEST_RECEIVED'
  | 'SESSION_SCHEDULED'
  | 'SESSION_RESCHEDULED'
  | 'SESSION_CANCELLED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referralId?: string | null;
  tutoringRequestId?: string | null;
  /** Sesión de tutoría a la que se refiere el aviso (programada, reprogramada o cancelada). */
  sessionId?: string | null;
  read: boolean;
  createdAt: Date;
}
