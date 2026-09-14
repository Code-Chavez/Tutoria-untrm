import { Router, type IRouter } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import profileRoutes from './profile.routes';
import studentRoutes from './student.routes';
import schoolRoutes from './school.routes';

const router: IRouter = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(roleRoutes);
router.use(profileRoutes);
router.use(studentRoutes);
router.use(schoolRoutes);

export default router;
