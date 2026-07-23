import { Router, type IRouter } from 'express';
import healthRoutes from './health.routes';

const router: IRouter = Router();

router.use(healthRoutes);

export default router;
