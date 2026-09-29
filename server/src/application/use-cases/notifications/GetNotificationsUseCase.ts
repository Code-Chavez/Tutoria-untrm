import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';

export class GetNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(userId: string): Promise<Notification[]> {
    return this.notifications.findByUser(userId);
  }
}
