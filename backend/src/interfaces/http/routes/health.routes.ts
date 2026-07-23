import { Router, Request, Response } from 'express';
import { prisma } from '../../../infrastructure/database/prisma';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'SIT API',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'SIT API',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
