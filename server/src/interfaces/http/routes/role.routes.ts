import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { RoleController } from '../controllers/RoleController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const roleController = new RoleController(
  container.useCases.listRolesUseCase,
  container.useCases.createRoleUseCase,
  container.useCases.updateRoleUseCase,
  container.useCases.setRoleActiveUseCase,
);

router.use('/roles', authenticate(container.services.tokenService));
router.get('/roles/permissions', authorize(['admin:system']), roleController.listPermissions);
router.get('/roles', roleController.list);
// Crear roles es una operación de administración del sistema (solo DBU).
router.post('/roles', authorize(['admin:system']), roleController.create);
// Editar permisos y activar/desactivar: solo administración del sistema; los roles base están protegidos.
router.put('/roles/:id', authorize(['admin:system']), roleController.update);
router.patch('/roles/:id/status', authorize(['admin:system']), roleController.setActive);

export default router;
