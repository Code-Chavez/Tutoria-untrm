import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/AuthController';
import { container } from '@infrastructure/container';

const controller = new AuthController(container.useCases.loginUseCase);

const router: IRouter = Router();

router.post('/auth/login', controller.login);

export default router;
