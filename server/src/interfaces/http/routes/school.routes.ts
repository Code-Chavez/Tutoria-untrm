import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { SchoolController } from '../controllers/SchoolController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const schoolController = new SchoolController(container.useCases.listSchoolsUseCase);

// Catálogo de escuelas profesionales para poblar formularios de estudiantes.
router.use('/schools', authenticate(container.services.tokenService));
router.get('/schools', authorize(['students:read']), schoolController.list);

export default router;
