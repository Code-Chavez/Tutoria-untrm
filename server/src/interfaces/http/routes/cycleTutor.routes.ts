import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { CycleTutorController } from '../controllers/CycleTutorController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new CycleTutorController(
  container.useCases.listCycleTutorsUseCase,
  container.useCases.setCycleTutorUseCase,
  container.useCases.removeCycleTutorUseCase,
  container.useCases.requestTutorAcceptanceUseCase,
  container.useCases.resendDeclineNoticeUseCase,
);
const requireAuth = authenticate(container.services.tokenService);

// Tutor de cada ciclo de una escuela en el periodo vigente: la DBU y la coordinación de esa escuela (alcance por escuela en el caso de uso).
router.get('/schools/:schoolId/cycle-tutors', requireAuth, authorize(['students:write']), controller.index);
router.put('/schools/:schoolId/cycle-tutors/:cycle', requireAuth, authorize(['students:write']), controller.set);
router.post('/schools/:schoolId/cycle-tutors/:cycle/acceptance-request', requireAuth, authorize(['students:write']), controller.resend);
// Reenviar solo el aviso del rechazo a la coordinación (mismo permiso y alcance que reenviar la aceptación).
router.post('/schools/:schoolId/cycle-tutors/:cycle/decline-notice/resend', requireAuth, authorize(['students:write']), controller.resendDeclineNotice);
router.delete('/schools/:schoolId/cycle-tutors/:cycle', requireAuth, authorize(['students:write']), controller.remove);

export default router;
