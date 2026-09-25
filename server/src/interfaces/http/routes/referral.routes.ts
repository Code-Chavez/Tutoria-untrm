import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { ReferralController } from '../controllers/ReferralController';
import { ReferralConstanciaPdf } from '../../../infrastructure/parsers/ReferralConstanciaPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const referralController = new ReferralController(
  container.useCases.createReferralUseCase,
  container.useCases.getReferralConstanciaUseCase,
  container.useCases.getReferralsUseCase,
  container.useCases.getReferralByIdUseCase,
  new ReferralConstanciaPdf(),
);

const requireAuth = authenticate(container.services.tokenService);

// Ficha de derivación (HU-28, Anexo N°6): confidencial desde su creación —
// exclusiva de quienes pueden ver/crear derivaciones (Docente Tutor,
// Profesional de Servicio, Coordinador en lectura).
router.post(
  '/students/:id/referrals',
  requireAuth,
  authorize(['referrals:write']),
  referralController.create,
);
router.get(
  '/referrals/:id/constancia',
  requireAuth,
  authorize(['referrals:read']),
  referralController.downloadConstancia,
);

// HU-30: Bandeja y detalle con visibilidad restringida por servicio/rol
router.get(
  '/referrals',
  requireAuth,
  authorize(['referrals:read']),
  referralController.getAll,
);
router.get(
  '/referrals/:id',
  requireAuth,
  authorize(['referrals:read']),
  referralController.getById,
);

export default router;
