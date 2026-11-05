import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { DataRequestController } from '../controllers/DataRequestController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new DataRequestController(
  container.useCases.sendDataRequestUseCase,
  container.useCases.listDataRequestsUseCase,
  container.useCases.markDataRequestReceivedUseCase,
  container.useCases.setSchoolRequestEmailUseCase,
);
const requireAuth = authenticate(container.services.tokenService);

// Pedido de listas por correo: quien carga estudiantes (DBU y coordinación, cada una en sus escuelas).
router.get('/data-requests', requireAuth, authorize(['students:import']), controller.index);
router.post('/data-requests', requireAuth, authorize(['students:import']), controller.create);
router.post('/data-requests/:id/received', requireAuth, authorize(['students:import']), controller.markReceived);
router.put('/schools/:id/request-email', requireAuth, authorize(['students:import']), controller.setRequestEmail);

export default router;
