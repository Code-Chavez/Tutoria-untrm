import { Request, Response } from 'express';
import { z } from 'zod';
import { SubmitEvaluationUseCase } from '@application/use-cases/evaluation/SubmitEvaluationUseCase';
import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import {
  NoActivePeriodError,
  EvaluationAlreadySubmittedError,
  TutorNotAssignedError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { submitEvaluationSchema } from '../validators/evaluation.validators';

export class EvaluationController {
  constructor(
    private readonly submitEvaluationUseCase: SubmitEvaluationUseCase,
    private readonly getEvaluationStatusUseCase: GetEvaluationStatusUseCase,
  ) {}

  // Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7).
  submit = async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.sub as string;
      const data = submitEvaluationSchema.parse(req.body);
      const evaluation = await this.submitEvaluationUseCase.execute(userId, data);
      res.status(201).json({ message: 'Evaluación registrada exitosamente', evaluation });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof StudentProfileNotLinkedError || error instanceof TutorNotAssignedError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError || error instanceof EvaluationAlreadySubmittedError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  getStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.sub as string;
      const status = await this.getEvaluationStatusUseCase.execute(userId);
      res.status(200).json(status);
    } catch (error) {
      if (error instanceof StudentProfileNotLinkedError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
