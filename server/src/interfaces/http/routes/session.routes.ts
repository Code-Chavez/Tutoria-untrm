import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { SessionController } from '../controllers/SessionController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const sessionController = new SessionController(
  container.useCases.scheduleSessionUseCase,
  container.useCases.listSessionsUseCase,
  container.useCases.registerAttendanceUseCase,
  container.useCases.rescheduleSessionUseCase,
  container.useCases.cancelSessionUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Programar una sesión de tutoría individual (HU-18, Art. 15.c). El tutor es
// siempre el usuario autenticado; sessions:write es exclusivo de Docente Tutor.
router.post('/sessions', requireAuth, authorize(['sessions:write']), sessionController.create);

// Listar sesiones (?mine=true para la agenda propia, ?studentId= para las de un estudiante).
router.get('/sessions', requireAuth, authorize(['sessions:read']), sessionController.list);

// Registrar la asistencia de una sesión individual (HU-22, Anexo N°4).
router.post(
  '/sessions/:id/attendance',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.registerAttendance,
);

// Reprogramar o cancelar una sesión con motivo obligatorio (HU-23).
router.patch(
  '/sessions/:id/reschedule',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.reschedule,
);
router.patch(
  '/sessions/:id/cancel',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.cancel,
);

export default router;
