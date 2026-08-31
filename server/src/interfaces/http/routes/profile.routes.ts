import { Router, type IRouter } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { authenticate } from '../middleware/authenticate';
import { container } from '@infrastructure/container';

const controller = new ProfileController(
  container.useCases.getProfileUseCase,
  container.useCases.updateProfileUseCase,
  container.useCases.changePasswordUseCase,
);

const router: IRouter = Router();

// Todo el perfil opera sobre el usuario autenticado (req.auth.sub).
router.use('/profile', authenticate(container.services.tokenService));

router.get('/profile', controller.get);
router.put('/profile', controller.update);
router.post('/profile/change-password', controller.changePassword);

export default router;
