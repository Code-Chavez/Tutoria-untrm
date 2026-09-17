import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { InterviewController } from '../controllers/InterviewController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const interviewController = new InterviewController(
  container.useCases.createInterviewUseCase,
  container.useCases.listInterviewsByStudentUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Registrar la entrevista inicial tutorial de un estudiante (HU-14, Anexo N° 3).
router.post(
  '/students/:id/interviews',
  requireAuth,
  authorize(['interviews:write']),
  interviewController.create,
);

// Listar las entrevistas de un estudiante (para el expediente, HU-16).
router.get(
  '/students/:id/interviews',
  requireAuth,
  authorize(['interviews:read']),
  interviewController.listByStudent,
);

export default router;
