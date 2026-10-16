import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { prisma } from '@infrastructure/database/prisma';

/**
 * La tutoría opera solo con un periodo académico abierto. Con el periodo cerrado (o sin periodo vigente) los registros
 * operativos —sesiones, asistencias, entrevistas, seguimientos, derivaciones, solicitudes— se rechazan: todo queda en solo
 * lectura. Las cargas y la administración (estudiantes, asignaciones, usuarios, catálogos) no pasan por aquí. Se consulta en
 * cada escritura (son pocas frente a las lecturas) para que el cierre rija al instante.
 */
export async function requireOpenPeriod(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const open = await prisma.academicPeriod.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!open) {
      next(new AppError(409, 'No hay un periodo académico abierto: la tutoría está en solo lectura', 'PERIOD_CLOSED'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
