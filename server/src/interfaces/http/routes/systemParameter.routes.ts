import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { SystemParameterController } from '../controllers/SystemParameterController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new SystemParameterController(
  container.useCases.listSystemParametersUseCase,
  container.useCases.updateSystemParameterUseCase,
);

// Parámetros del sistema (HU-49): solo con parameters:manage (DBU).
router.use('/system-parameters', authenticate(container.services.tokenService), authorize(['parameters:manage']));
router.get('/system-parameters', controller.list);
router.put('/system-parameters/:key', controller.update);

export default router;
