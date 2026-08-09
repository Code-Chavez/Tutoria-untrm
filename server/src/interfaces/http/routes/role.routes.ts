import { Router } from 'express';
import { container } from '../../../infrastructure/container';
import { RoleController } from '../controllers/RoleController';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const roleController = new RoleController(container.useCases.listRolesUseCase);

router.use('/roles', authenticate(container.services.tokenService));
router.get('/roles', roleController.list);

export default router;
