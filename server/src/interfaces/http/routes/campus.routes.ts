import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { CampusController } from '../controllers/CampusController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new CampusController(
  container.useCases.listCampusesUseCase,
  container.useCases.createCampusUseCase,
  container.useCases.updateCampusUseCase,
  container.useCases.setSchoolCampusUseCase,
);
const requireAuth = authenticate(container.services.tokenService);

// Sedes de la universidad (Central, Bagua, Utcubamba): las configura Vicerrectorado o la DBU; la lista trae también las escuelas con su sede.
router.get('/campuses', requireAuth, authorize(['campuses:manage']), controller.index);
router.post('/campuses', requireAuth, authorize(['campuses:manage']), controller.create);
router.patch('/campuses/:id', requireAuth, authorize(['campuses:manage']), controller.update);
router.put('/schools/:id/campus', requireAuth, authorize(['campuses:manage']), controller.setForSchool);

export default router;
