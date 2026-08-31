import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const userController = new UserController(
  container.useCases.createUserUseCase,
  container.useCases.updateUserUseCase,
  container.useCases.toggleUserStatusUseCase,
  container.useCases.listUsersUseCase
);

// Todas las rutas de usuarios requieren autenticación
router.use('/users', authenticate(container.services.tokenService));

// Listar usuarios (requiere permiso de leer usuarios)
router.get('/users', authorize(['users:read']), userController.list);

// Crear usuario (requiere permiso de crear/editar usuarios)
router.post('/users', authorize(['users:write']), userController.create);

// Actualizar usuario (requiere permiso de crear/editar usuarios)
router.patch('/users/:id', authorize(['users:write']), userController.update);

// Cambiar estado (requiere permiso de desactivar usuarios)
router.patch('/users/:id/status', authorize(['users:delete']), userController.toggleStatus);

export default router;
