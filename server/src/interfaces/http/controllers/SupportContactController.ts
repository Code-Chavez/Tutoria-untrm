import { Request, Response } from 'express';
import { z } from 'zod';
import { UpsertSupportContactUseCase } from '@application/use-cases/support-contacts/UpsertSupportContactUseCase';
import { GetSupportContactUseCase } from '@application/use-cases/support-contacts/GetSupportContactUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { upsertSupportContactSchema } from '../validators/supportContact.validators';

export class SupportContactController {
  constructor(
    private readonly upsertSupportContactUseCase: UpsertSupportContactUseCase,
    private readonly getSupportContactUseCase: GetSupportContactUseCase,
  ) {}

  upsert = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = upsertSupportContactSchema.parse(req.body);
      const contact = await this.upsertSupportContactUseCase.execute(studentId, data);
      res.status(200).json({ message: 'Persona de red de apoyo registrada exitosamente', contact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  getByStudent = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const contact = await this.getSupportContactUseCase.execute(studentId);
      res.status(200).json({ contact });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
