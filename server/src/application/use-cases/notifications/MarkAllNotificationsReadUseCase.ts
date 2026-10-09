import { NotificationRepository } from '@domain/repositories/NotificationRepository';

/** Marca como leídos todos los avisos pendientes del usuario autenticado (R03). */
export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(userId: string): Promise<number> {
    return this.notifications.markAllRead(userId);
  }
}
