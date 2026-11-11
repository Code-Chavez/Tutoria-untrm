import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { PeriodController } from '../controllers/PeriodController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new PeriodController(
  container.useCases.getCurrentPeriodUseCase,
  container.useCases.getPeriodClosureUseCase,
  container.useCases.closePeriodUseCase,
  container.useCases.reopenPeriodUseCase,
);
const requireAuth = authenticate(container.services.tokenService);

// Cualquier persona autenticada puede saber si la tutoría está abierta o en solo lectura.
router.get('/periods/current', requireAuth, controller.current);
router.get('/periods/options', requireAuth, authorize(['students:read']), async (_req, res, next) => {
  try {
    const periods = await container.useCases.listCatalogUseCase.execute('periods');
    res.json({ periods: periods.map(({ id, name, isActive }) => ({ id, name, isActive })) });
  } catch (error) {
    next(error);
  }
});

// Cierre del periodo: solo quien administra los catálogos (DBU).
router.get('/periods/:id/closure', requireAuth, authorize(['catalogs:manage']), controller.closure);
router.post('/periods/:id/close', requireAuth, authorize(['catalogs:manage']), controller.close);
router.post('/periods/:id/reopen', requireAuth, authorize(['catalogs:manage']), controller.reopen);

export default router;
