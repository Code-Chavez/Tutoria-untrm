import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { RoleController } from '../controllers/RoleController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const roleController = new RoleController(
  container.useCases.listRolesUseCase,
  container.useCases.createRoleUseCase,
);

router.use('/roles', authenticate(container.services.tokenService));
router.get('/roles', roleController.list);
// Crear roles es una operación de administración del sistema (solo DBU).
router.post('/roles', authorize(['admin:system']), roleController.create);

export default router;
