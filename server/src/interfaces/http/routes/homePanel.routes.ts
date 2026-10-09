import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { HomePanelController } from '../controllers/HomePanelController';
import { authenticate } from '../middleware/authenticate';

const router: IRouter = Router();
const controller = new HomePanelController(container.useCases.getHomePanelUseCase);

// Panel de inicio (HU-49): lo ve cualquier usuario autenticado; el contenido
// lo decide el rol dentro del caso de uso.
router.get('/home-panel', authenticate(container.services.tokenService), controller.get);

export default router;
