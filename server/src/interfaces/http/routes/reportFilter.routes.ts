import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { ReportFilterController } from '../controllers/ReportFilterController';
import { authenticate } from '../middleware/authenticate';

const router: IRouter = Router();
const controller = new ReportFilterController(container.useCases.getReportFilterOptionsUseCase);

// Opciones de filtro (HU-47): el alcance por rol lo resuelve el caso de uso,
// que rechaza a quien no sea DBU, Vicerrectorado o Coordinador.
router.get('/report-filters', authenticate(container.services.tokenService), controller.options);

export default router;
