import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { AuditLogController } from '../controllers/AuditLogController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new AuditLogController(
  container.useCases.listAuditLogUseCase,
  container.useCases.getAuditLogOptionsUseCase,
);

// Bitácora de auditoría (UI-09): solo con audit:read (DBU).
router.use('/audit', authenticate(container.services.tokenService), authorize(['audit:read']));
router.get('/audit', controller.list);
router.get('/audit/options', controller.options);

export default router;
