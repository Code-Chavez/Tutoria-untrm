import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateInterviewUseCase } from '@application/use-cases/interviews/CreateInterviewUseCase';
import { ListInterviewsByStudentUseCase } from '@application/use-cases/interviews/ListInterviewsByStudentUseCase';
import { InterviewMotiveRequiredError } from '@application/use-cases/interviews/InterviewErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { createInterviewSchema } from '../validators/interview.validators';

export class InterviewController {
  constructor(
    private readonly createInterviewUseCase: CreateInterviewUseCase,
    private readonly listInterviewsByStudentUseCase: ListInterviewsByStudentUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = createInterviewSchema.parse(req.body);
      const conductedById = req.auth?.sub as string; // authenticate() garantiza req.auth
      const interview = await this.createInterviewUseCase.execute(studentId, conductedById, data);
      res.status(201).json({ message: 'Entrevista registrada exitosamente', interview });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof InterviewMotiveRequiredError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  listByStudent = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const interviews = await this.listInterviewsByStudentUseCase.execute(studentId);
      res.status(200).json({ interviews });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
