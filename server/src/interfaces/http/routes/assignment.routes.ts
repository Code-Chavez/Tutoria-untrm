import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { AssignmentController } from '../controllers/AssignmentController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const assignmentController = new AssignmentController(
  container.useCases.assignStudentsUseCase,
  container.useCases.getTutorWorkloadUseCase,
);

router.use('/tutors', authenticate(container.services.tokenService));
router.use('/students/assign', authenticate(container.services.tokenService));

// Carga de tutorados por tutor (para la vista de asignación).
router.get('/tutors/workload', authorize(['students:write']), assignmentController.workload);

// Asignación masiva tutor↔tutorados (HU-12).
router.post('/students/assign', authorize(['students:write']), assignmentController.assign);

export default router;
