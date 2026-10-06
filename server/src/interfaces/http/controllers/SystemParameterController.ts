import { Request, Response } from 'express';
import { z } from 'zod';
import {
  InvalidParameterValueError,
  ListSystemParametersUseCase,
  UnknownParameterError,
  UpdateSystemParameterUseCase,
} from '@application/use-cases/system-parameters/SystemParameterUseCases';

const bodySchema = z.object({ value: z.union([z.number(), z.string()]) });

export class SystemParameterController {
  constructor(
    private readonly listSystemParametersUseCase: ListSystemParametersUseCase,
    private readonly updateSystemParameterUseCase: UpdateSystemParameterUseCase,
  ) {}

  // Parámetros del sistema (HU-49): duración y número de sesiones, plazos y umbrales de alerta.
  list = async (_req: Request, res: Response) => {
    try {
      res.status(200).json({ parameters: await this.listSystemParametersUseCase.execute() });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { value } = bodySchema.parse(req.body);
      const parameter = await this.updateSystemParameterUseCase.execute(
        req.auth?.sub as string,
        req.params.key as string,
        value,
      );
      res.status(200).json({ message: 'Parámetro actualizado', parameter });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof InvalidParameterValueError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnknownParameterError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
