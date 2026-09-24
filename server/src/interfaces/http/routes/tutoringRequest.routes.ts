import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { TutoringRequestController } from '../controllers/TutoringRequestController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const tutoringRequestController = new TutoringRequestController(
  container.useCases.createTutoringRequestUseCase,
  container.useCases.listTutoringRequestsUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Registrar una solicitud de tutoría para un estudiante (HU-17, Art. 19.b/19.c).
router.post(
  '/students/:id/tutoring-requests',
  requireAuth,
  authorize(['tutoring-requests:write']),
  tutoringRequestController.create,
);

// Listar solicitudes (propias con ?mine=true, o de un estudiante con ?studentId=).
router.get(
  '/tutoring-requests',
  requireAuth,
  authorize(['tutoring-requests:read']),
  tutoringRequestController.list,
);

export default router;
