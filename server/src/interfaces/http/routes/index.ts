import { Router, type IRouter } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import profileRoutes from './profile.routes';

const router: IRouter = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(roleRoutes);
router.use(profileRoutes);

export default router;
