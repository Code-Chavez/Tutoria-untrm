import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateFollowUpUseCase } from '@application/use-cases/follow-ups/CreateFollowUpUseCase';
import { ListFollowUpsByStudentUseCase } from '@application/use-cases/follow-ups/ListFollowUpsByStudentUseCase';
import { FollowUpInstructorDetailsRequiredError } from '@application/use-cases/follow-ups/FollowUpErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { createFollowUpSchema } from '../validators/followUp.validators';

export class FollowUpController {
  constructor(
    private readonly createFollowUpUseCase: CreateFollowUpUseCase,
    private readonly listFollowUpsByStudentUseCase: ListFollowUpsByStudentUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = createFollowUpSchema.parse(req.body);
      const conductedById = req.auth?.sub as string; // authenticate() garantiza req.auth
      const followUp = await this.createFollowUpUseCase.execute(studentId, conductedById, data);
      res.status(201).json({ message: 'Ficha de seguimiento registrada exitosamente', followUp });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof FollowUpInstructorDetailsRequiredError) {
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
      const followUps = await this.listFollowUpsByStudentUseCase.execute(studentId);
      res.status(200).json({ followUps });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
