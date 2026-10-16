import { Request, Response } from 'express';
import { z } from 'zod';
import {
  ClosePeriodUseCase,
  GetCurrentPeriodUseCase,
  GetPeriodClosureUseCase,
  PeriodConfirmationError,
  PeriodNotActiveError,
  PeriodNotFoundError,
  PeriodReopenError,
  ReopenPeriodUseCase,
} from '@application/use-cases/periods/PeriodLifecycleUseCases';

const closeSchema = z.object({ confirmName: z.string({ required_error: 'Escriba el nombre del periodo para confirmar' }).trim().min(1, 'Escriba el nombre del periodo para confirmar') });

export class PeriodController {
  constructor(
    private readonly getCurrent: GetCurrentPeriodUseCase,
    private readonly getClosure: GetPeriodClosureUseCase,
    private readonly closePeriod: ClosePeriodUseCase,
    private readonly reopenPeriod: ReopenPeriodUseCase,
  ) {}

  private fail(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message ?? 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof PeriodNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof PeriodConfirmationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof PeriodNotActiveError || error instanceof PeriodReopenError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  current = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.getCurrent.execute(req.auth?.sub));
    } catch (error) {
      this.fail(error, res);
    }
  };

  closure = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.getClosure.execute(req.params.id as string));
    } catch (error) {
      this.fail(error, res);
    }
  };

  close = async (req: Request, res: Response) => {
    try {
      const { confirmName } = closeSchema.parse(req.body);
      res.status(200).json({ message: 'Periodo cerrado', ...(await this.closePeriod.execute(req.auth?.sub as string, req.params.id as string, confirmName, req.ip)) });
    } catch (error) {
      this.fail(error, res);
    }
  };

  reopen = async (req: Request, res: Response) => {
    try {
      await this.reopenPeriod.execute(req.auth?.sub as string, req.params.id as string, req.ip);
      res.status(200).json({ message: 'Periodo reabierto' });
    } catch (error) {
      this.fail(error, res);
    }
  };
}
