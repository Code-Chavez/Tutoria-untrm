import { Router, type IRouter } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router: IRouter = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(userRoutes);

export default router;
