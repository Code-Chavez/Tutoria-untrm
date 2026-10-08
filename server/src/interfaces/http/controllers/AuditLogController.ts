import { Request, Response } from 'express';
import { z } from 'zod';
import {
  AuditLogForbiddenError,
  GetAuditLogOptionsUseCase,
  ListAuditLogUseCase,
} from '@application/use-cases/audit/AuditLogUseCases';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD');

const querySchema = z.object({
  from: day.optional(),
  to: day.optional(),
  actor: z.string().trim().max(100).optional(),
  entity: z.string().trim().max(60).optional(),
  action: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export class AuditLogController {
  constructor(
    private readonly listAuditLogUseCase: ListAuditLogUseCase,
    private readonly getAuditLogOptionsUseCase: GetAuditLogOptionsUseCase,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof AuditLogForbiddenError) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  list = async (req: Request, res: Response) => {
    try {
      const filters = querySchema.parse(req.query);
      res.status(200).json(await this.listAuditLogUseCase.execute(req.auth?.sub as string, filters));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  options = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.getAuditLogOptionsUseCase.execute(req.auth?.sub as string));
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
