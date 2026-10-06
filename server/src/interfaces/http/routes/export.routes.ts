import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { ExportController } from '../controllers/ExportController';
import {
  EvaluationStatisticsPdf,
  EvaluationStatisticsWorkbook,
} from '../../../infrastructure/parsers/EvaluationStatisticsExports';
import { IndicatorsPdf, IndicatorsWorkbook } from '../../../infrastructure/parsers/IndicatorsExports';
import { WorkPlanPdf } from '../../../infrastructure/parsers/WorkPlanPdf';
import { StudentRecordPdf } from '../../../infrastructure/parsers/StudentRecordPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new ExportController(
  container.useCases.getEvaluationStatisticsUseCase,
  container.useCases.getIndicatorsUseCase,
  container.useCases.getWorkPlanUseCase,
  container.useCases.getStudentRecordUseCase,
  new EvaluationStatisticsPdf(),
  new EvaluationStatisticsWorkbook(),
  new IndicatorsPdf(),
  new IndicatorsWorkbook(),
  new WorkPlanPdf(),
  new StudentRecordPdf(),
);

const requireAuth = authenticate(container.services.tokenService);

// Exportaciones (HU-46): mismos permisos y alcance que la consulta en pantalla.
router.get('/evaluations/statistics/pdf', requireAuth, authorize(['evaluation:manage']), controller.evaluationStatistics('pdf'));
router.get('/evaluations/statistics/excel', requireAuth, authorize(['evaluation:manage']), controller.evaluationStatistics('excel'));
router.get('/indicators/pdf', requireAuth, authorize(['indicators:read']), controller.indicators('pdf'));
router.get('/indicators/excel', requireAuth, authorize(['indicators:read']), controller.indicators('excel'));
router.get('/work-plans/:schoolId/pdf', requireAuth, authorize(['work-plans:read']), controller.workPlan);
router.get('/students/:id/record/pdf', requireAuth, authorize(['students:read']), controller.studentRecord);

export default router;
