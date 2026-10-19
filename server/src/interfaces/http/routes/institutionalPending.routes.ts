import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { InstitutionalPendingController } from '../controllers/InstitutionalPendingController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new InstitutionalPendingController(container.useCases.getInstitutionalPendingUseCase);
const requireAuth = authenticate(container.services.tokenService);

// Pendientes institucionales de la coordinación (sus escuelas) y la DBU (todas); el alcance lo decide el caso de uso.
router.get('/institutional-pending', requireAuth, authorize(['students:write']), controller.index);

export default router;
