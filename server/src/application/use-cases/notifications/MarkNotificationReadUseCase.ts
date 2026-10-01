import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { NotificationNotFoundError } from './NotificationErrors';

export class MarkNotificationReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(id: string, userId: string): Promise<Notification> {
    const notification = await this.notifications.markRead(id, userId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }
    return notification;
  }
}
