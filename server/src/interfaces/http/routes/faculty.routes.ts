import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { FacultyController } from '../controllers/FacultyController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const facultyController = new FacultyController(container.useCases.listFacultiesUseCase);

// Catálogo de facultades, para poblar filtros (HU-39).
router.use('/faculties', authenticate(container.services.tokenService));
router.get('/faculties', authorize(['evaluation:manage']), facultyController.list);

export default router;
