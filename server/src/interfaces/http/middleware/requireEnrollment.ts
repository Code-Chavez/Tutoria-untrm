import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { prisma } from '@infrastructure/database/prisma';

/**
 * Un estudiante solo puede actuar por sí mismo (solicitar tutoría, evaluar al tutor) si figura en la carga del periodo
 * vigente. Quien no fue cargado en el nuevo periodo conserva la lectura de su historial y nada más. Sin periodo vigente
 * no decide (lo rechaza `requireOpenPeriod`). Se consulta en cada escritura para que la matrícula rija al instante.
 */
export async function requireEnrollment(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const period = await prisma.academicPeriod.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!period) {
      next();
      return;
    }
    const enrolled = await prisma.periodEnrollment.findFirst({
      where: { periodId: period.id, student: { userId: req.auth?.sub } },
      select: { id: true },
    });
    if (!enrolled) {
      next(new AppError(403, 'No figuras en la carga del periodo vigente: por ahora solo puedes consultar tu historial', 'NOT_ENROLLED'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
