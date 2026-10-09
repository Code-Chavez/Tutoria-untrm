import { Router, type IRouter } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/authenticate';
import { container } from '@infrastructure/container';

const controller = new NotificationController(
  container.useCases.getNotificationsUseCase,
  container.useCases.markNotificationReadUseCase,
  container.useCases.markAllNotificationsReadUseCase,
);

const router: IRouter = Router();

// Bandeja de notificaciones (HU-33): siempre sobre el usuario autenticado.
router.use('/notifications', authenticate(container.services.tokenService));

router.get('/notifications', controller.getAll);
router.patch('/notifications/read-all', controller.markAllRead);
router.patch('/notifications/:id/read', controller.markRead);

export default router;
