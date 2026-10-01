import { Request, Response } from 'express';
import { GetNotificationsUseCase } from '@application/use-cases/notifications/GetNotificationsUseCase';
import { MarkNotificationReadUseCase } from '@application/use-cases/notifications/MarkNotificationReadUseCase';
import { NotificationNotFoundError } from '@application/use-cases/notifications/NotificationErrors';

export class NotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  // Bandeja de notificaciones del usuario autenticado (HU-33)
  getAll = async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.sub as string;
      const notifications = await this.getNotificationsUseCase.execute(userId);
      res.status(200).json(notifications);
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  markRead = async (req: Request, res: Response) => {
    try {
      const notificationId = req.params.id as string;
      const userId = req.auth?.sub as string;
      const notification = await this.markNotificationReadUseCase.execute(notificationId, userId);
      res.status(200).json(notification);
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
