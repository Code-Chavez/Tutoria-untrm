import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { StudentRecordController } from '../controllers/StudentRecordController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const studentRecordController = new StudentRecordController(
  container.useCases.getStudentRecordUseCase,
);

// Expediente del tutorado (HU-16): entrevistas, historial de asignación y
// estado, en orden cronológico. Visible para quien ya puede ver tutorados;
// la persona de red de apoyo se incluye solo si el rol tiene ese permiso.
router.get(
  '/students/:id/record',
  authenticate(container.services.tokenService),
  authorize(['students:read']),
  studentRecordController.get,
);

export default router;
