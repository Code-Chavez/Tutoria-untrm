import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { IndicatorsController } from '../controllers/IndicatorsController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new IndicatorsController(container.useCases.getIndicatorsUseCase);

const requireAuth = authenticate(container.services.tokenService);

// Tablero de indicadores (HU-45): el alcance por escuela lo resuelve el caso de uso.
router.get('/indicators', requireAuth, authorize(['indicators:read']), controller.get);

export default router;
