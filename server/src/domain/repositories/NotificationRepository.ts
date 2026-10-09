import { Notification, NotificationType } from '../entities/Notification';

export interface NotificationRepository {
  create(data: {
    userId: string;
    type: NotificationType;
    message: string;
    referralId?: string | null;
    tutoringRequestId?: string | null;
  }): Promise<Notification>;
  /** Los avisos más recientes del usuario (el resto queda archivado, no se descarta). */
  findByUser(userId: string, limit?: number): Promise<Notification[]>;
  /** Marca como leídos todos los avisos pendientes del usuario; devuelve cuántos eran. */
  markAllRead(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<Notification | null>;
}
