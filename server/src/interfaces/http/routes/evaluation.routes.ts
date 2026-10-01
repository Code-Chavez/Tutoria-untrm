import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { EvaluationController } from '../controllers/EvaluationController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const evaluationController = new EvaluationController(
  container.useCases.submitEvaluationUseCase,
  container.useCases.getEvaluationStatusUseCase,
  container.useCases.getEvaluationResultsUseCase,
  container.useCases.listEvaluationWindowsUseCase,
  container.useCases.setEvaluationWindowUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7):
// autoservicio del tutorado sobre sí mismo, igual que las solicitudes de
// tutoría (HU-17).
router.get(
  '/evaluations/status',
  requireAuth,
  authorize(['evaluation:respond']),
  evaluationController.getStatus,
);
router.post(
  '/evaluations',
  requireAuth,
  authorize(['evaluation:respond']),
  evaluationController.submit,
);

// Resultados agregados y anónimos de un tutor (HU-37): solo para quien
// administra el programa de tutoría, nunca el propio tutor evaluado.
router.get(
  '/evaluations/results/:tutorId',
  requireAuth,
  authorize(['evaluation:manage']),
  evaluationController.getResults,
);

// Apertura/cierre de la evaluación por escuela (HU-38, Art. 17.d): exclusivo
// del Administrador DBU.
router.get(
  '/evaluation-windows',
  requireAuth,
  authorize(['evaluation:manage']),
  evaluationController.listWindows,
);
router.patch(
  '/evaluation-windows/:schoolId',
  requireAuth,
  authorize(['evaluation:manage']),
  evaluationController.setWindow,
);

export default router;
