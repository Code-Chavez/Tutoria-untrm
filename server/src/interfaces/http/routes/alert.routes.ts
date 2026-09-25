import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { AlertController } from '../controllers/AlertController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const alertController = new AlertController(container.useCases.getRiskAlertsUseCase);

const requireAuth = authenticate(container.services.tokenService);

// Alertas de inasistencia y riesgo (HU-26): visibles para quien puede ver
// tutorados y sesiones (Docente Tutor y Coordinador).
router.get(
  '/alerts',
  requireAuth,
  authorize(['students:read', 'sessions:read']),
  alertController.list,
);

export default router;
