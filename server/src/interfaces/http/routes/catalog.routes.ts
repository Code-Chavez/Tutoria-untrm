import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { CatalogController } from '../controllers/CatalogController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new CatalogController(
  container.useCases.listCatalogUseCase,
  container.useCases.createCatalogEntryUseCase,
  container.useCases.updateCatalogEntryUseCase,
  container.useCases.deleteCatalogEntryUseCase,
);

// Gestión de catálogos maestros (HU-48): solo con catalogs:manage (DBU).
router.use('/catalogs', authenticate(container.services.tokenService), authorize(['catalogs:manage']));
router.get('/catalogs/:type', controller.list);
router.post('/catalogs/:type', controller.create);
router.put('/catalogs/:type/:id', controller.update);
router.delete('/catalogs/:type/:id', controller.remove);

export default router;
