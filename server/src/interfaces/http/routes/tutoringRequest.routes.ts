import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { TutoringRequestController } from '../controllers/TutoringRequestController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const tutoringRequestController = new TutoringRequestController(
  container.useCases.createTutoringRequestUseCase,
  container.useCases.listTutoringRequestsUseCase,
  container.useCases.createOwnTutoringRequestUseCase,
  container.useCases.listOwnTutoringRequestsUseCase,
  container.useCases.updateTutoringRequestStatusUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Registrar una solicitud de tutoría para un estudiante (HU-17, Art. 19.b/19.c).
router.post(
  '/students/:id/tutoring-requests',
  requireAuth,
  authorize(['tutoring-requests:write']),
  tutoringRequestController.create,
);

// Autoservicio: el propio tutorado solicita tutoría para sí mismo.
router.post(
  '/tutoring-requests/me',
  requireAuth,
  authorize(['tutoring-requests:self']),
  tutoringRequestController.createOwn,
);

// Historial propio del tutorado (estado y respuesta). Antes de /:id para que «mine» no se tome por un identificador.
router.get(
  '/tutoring-requests/mine',
  requireAuth,
  authorize(['tutoring-requests:self']),
  tutoringRequestController.listOwn,
);

// Seguimiento de una solicitud: en atención / atendida con respuesta (R01).
router.patch(
  '/tutoring-requests/:id/status',
  requireAuth,
  authorize(['tutoring-requests:write']),
  tutoringRequestController.updateStatus,
);

// Bandeja: solicitudes recibidas (?mine=true), de un estudiante (?studentId=) o por estado (?status=).
router.get(
  '/tutoring-requests',
  requireAuth,
  authorize(['tutoring-requests:read']),
  tutoringRequestController.list,
);

export default router;
