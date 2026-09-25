import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { SessionController } from '../controllers/SessionController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const sessionController = new SessionController(
  container.useCases.scheduleSessionUseCase,
  container.useCases.listSessionsUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Programar una sesión de tutoría individual (HU-18, Art. 15.c). El tutor es
// siempre el usuario autenticado; sessions:write es exclusivo de Docente Tutor.
router.post('/sessions', requireAuth, authorize(['sessions:write']), sessionController.create);

// Listar sesiones (?mine=true para la agenda propia, ?studentId= para las de un estudiante).
router.get('/sessions', requireAuth, authorize(['sessions:read']), sessionController.list);

export default router;
