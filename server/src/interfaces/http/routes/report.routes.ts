import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { ReportController } from '../controllers/ReportController';
import { ScheduleAttendanceReportWorkbook } from '../../../infrastructure/parsers/ScheduleAttendanceReportWorkbook';
import { ScheduleAttendanceReportPdf } from '../../../infrastructure/parsers/ScheduleAttendanceReportPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const reportController = new ReportController(
  container.useCases.getScheduleAttendanceReportUseCase,
  new ScheduleAttendanceReportWorkbook(),
  new ScheduleAttendanceReportPdf(),
);

const requireAuth = authenticate(container.services.tokenService);

// Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d).
router.get(
  '/reports/schedule-attendance',
  requireAuth,
  authorize(['reports:read']),
  reportController.getReport,
);
router.get(
  '/reports/schedule-attendance/excel',
  requireAuth,
  authorize(['reports:export']),
  reportController.downloadExcel,
);
router.get(
  '/reports/schedule-attendance/pdf',
  requireAuth,
  authorize(['reports:export']),
  reportController.downloadPdf,
);

export default router;
