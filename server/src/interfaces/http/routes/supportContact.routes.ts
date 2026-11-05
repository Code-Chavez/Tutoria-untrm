import { Router, type IRouter } from 'express';
import { requireOpenPeriod } from '../middleware/requireOpenPeriod';
import { auditAccess, byParam } from '../middleware/auditAccess';
import { container } from '../../../infrastructure/container';
import { SupportContactController } from '../controllers/SupportContactController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const supportContactController = new SupportContactController(
  container.useCases.upsertSupportContactUseCase,
  container.useCases.getSupportContactUseCase,
);

const requireAuth = authenticate(container.services.tokenService);

// Persona de red de apoyo — Anexo N° 3 sección II (HU-15). Visible solo para
// Docente Tutor y Administrador DBU (permisos support-contacts:*).
router.put(
  '/students/:id/support-contact',
  requireAuth,
  authorize(['support-contacts:write']), requireOpenPeriod,
  supportContactController.upsert,
);

router.get(
  '/students/:id/support-contact',
  requireAuth,
  auditAccess('SupportContact', 'READ', byParam('id')),
  authorize(['support-contacts:read']),
  supportContactController.getByStudent,
);

export default router;
