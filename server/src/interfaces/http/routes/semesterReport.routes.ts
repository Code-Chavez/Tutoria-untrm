import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { SemesterReportController } from '../controllers/SemesterReportController';
import { SemesterReportPdf } from '../../../infrastructure/parsers/SemesterReportPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new SemesterReportController(
  container.useCases.getMySemesterReportUseCase,
  container.useCases.saveMySemesterReportUseCase,
  container.useCases.getSemesterReportForExportUseCase,
  new SemesterReportPdf(),
);

const requireAuth = authenticate(container.services.tokenService);

// Informe semestral del tutor (HU-43, Anexo N°9): el tutor solo accede al suyo.
router.get('/semester-reports/me', requireAuth, authorize(['semester-reports:write']), controller.getMine);
router.put('/semester-reports/me', requireAuth, authorize(['semester-reports:write']), controller.saveMine);
router.get(
  '/semester-reports/me/pdf',
  requireAuth,
  authorize(['semester-reports:write']),
  controller.downloadMinePdf,
);

export default router;
