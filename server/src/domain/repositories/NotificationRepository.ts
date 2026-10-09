import { Notification, NotificationType } from '../entities/Notification';

export interface NotificationRepository {
  create(data: {
    userId: string;
    type: NotificationType;
    message: string;
    referralId?: string | null;
    tutoringRequestId?: string | null;
  }): Promise<Notification>;
  findByUser(userId: string): Promise<Notification[]>;
  markRead(id: string, userId: string): Promise<Notification | null>;
}
