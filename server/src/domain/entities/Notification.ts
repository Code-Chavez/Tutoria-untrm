// Notificación de derivación (HU-33).
export type NotificationType = 'REFERRAL_CREATED' | 'REFERRAL_STATUS_CHANGED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referralId?: string | null;
  read: boolean;
  createdAt: Date;
}
