import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { ConsolidatedReportController } from '../controllers/ConsolidatedReportController';
import { ConsolidatedReportWorkbook } from '../../../infrastructure/parsers/ConsolidatedReportWorkbook';
import { ConsolidatedReportPdf } from '../../../infrastructure/parsers/ConsolidatedReportPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new ConsolidatedReportController(
  container.useCases.getConsolidatedReportUseCase,
  new ConsolidatedReportWorkbook(),
  new ConsolidatedReportPdf(),
);

const requireAuth = authenticate(container.services.tokenService);

// Informe consolidado por escuela y facultad (HU-44): DBU y Vicerrectorado.
router.get(
  '/consolidated-reports',
  requireAuth,
  authorize(['consolidated-reports:read']),
  controller.getReport,
);
router.get(
  '/consolidated-reports/excel',
  requireAuth,
  authorize(['consolidated-reports:read']),
  controller.downloadExcel,
);
router.get(
  '/consolidated-reports/pdf',
  requireAuth,
  authorize(['consolidated-reports:read']),
  controller.downloadPdf,
);

export default router;
