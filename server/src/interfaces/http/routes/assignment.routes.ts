import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { AssignmentController } from '../controllers/AssignmentController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const assignmentController = new AssignmentController(
  container.useCases.assignStudentsUseCase,
  container.useCases.getTutorWorkloadUseCase,
  container.useCases.reassignStudentUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Carga de tutorados por tutor (para la vista de asignación).
router.get('/tutors/workload', requireAuth, authorize(['students:write']), assignmentController.workload);

// Asignación masiva tutor↔tutorados (HU-12).
router.post('/students/assign', requireAuth, authorize(['students:write']), assignmentController.assign);

// Reasignación individual de un tutorado, con motivo obligatorio (HU-13).
router.patch(
  '/students/:id/reassign',
  requireAuth,
  authorize(['students:write']),
  assignmentController.reassign,
);

export default router;
