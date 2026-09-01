import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/AuthController';
import { container } from '@infrastructure/container';

const controller = new AuthController(
  container.useCases.loginUseCase,
  container.useCases.requestPasswordResetUseCase,
  container.useCases.resetPasswordUseCase
);

const router: IRouter = Router();

router.post('/auth/login', controller.login);
router.post('/auth/forgot-password', controller.requestPasswordReset);
router.post('/auth/reset-password', controller.resetPassword);

export default router;
