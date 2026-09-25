import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { FollowUpController } from '../controllers/FollowUpController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const followUpController = new FollowUpController(
  container.useCases.createFollowUpUseCase,
  container.useCases.listFollowUpsByStudentUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Registrar una ficha de seguimiento de un estudiante (HU-24, Anexo N° 5).
router.post(
  '/students/:id/follow-ups',
  requireAuth,
  authorize(['followups:write']),
  followUpController.create,
);

// Listar las fichas de seguimiento de un estudiante (para el expediente, HU-16).
router.get(
  '/students/:id/follow-ups',
  requireAuth,
  authorize(['followups:read']),
  followUpController.listByStudent,
);

export default router;
