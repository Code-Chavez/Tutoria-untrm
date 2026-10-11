import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Errores del analizador del cuerpo (JSON mal formado o demasiado grande): son del cliente, no del servidor.
  const bodyError = err as Error & { type?: string };
  if (bodyError.type === 'entity.parse.failed') {
    res.status(400).json({ status: 'error', message: 'El cuerpo de la petición no es un JSON válido' });
    return;
  }
  if (bodyError.type === 'entity.too.large') {
    res.status(413).json({ status: 'error', message: 'El cuerpo de la petición es demasiado grande' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
  });
}
