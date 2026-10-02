import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { WorkPlanController } from '../controllers/WorkPlanController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const workPlanController = new WorkPlanController(
  container.useCases.listWorkPlansUseCase,
  container.useCases.getWorkPlanUseCase,
  container.useCases.saveWorkPlanUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Plan de trabajo semestral (HU-41, Art. 17.a): el acceso por escuela se
// valida dentro de los casos de uso (DBU todas; Coordinador solo las suyas).
router.get('/work-plans', requireAuth, authorize(['work-plans:read']), workPlanController.list);
router.get(
  '/work-plans/:schoolId',
  requireAuth,
  authorize(['work-plans:read']),
  workPlanController.get,
);
router.put(
  '/work-plans/:schoolId',
  requireAuth,
  authorize(['work-plans:write']),
  workPlanController.save,
);

export default router;
