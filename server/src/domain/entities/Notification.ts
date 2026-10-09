// Notificación de derivación (HU-33).
export type NotificationType =
  | 'REFERRAL_CREATED'
  | 'REFERRAL_STATUS_CHANGED'
  | 'TUTORING_REQUEST_CREATED'
  | 'TUTORING_REQUEST_UPDATED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referralId?: string | null;
  tutoringRequestId?: string | null;
  read: boolean;
  createdAt: Date;
}
