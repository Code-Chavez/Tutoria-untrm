import { Request, Response } from 'express';
import { z } from 'zod';
import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import { GetTutorWorkloadUseCase } from '@application/use-cases/assignments/GetTutorWorkloadUseCase';
import {
  TutorNotFoundError,
  NoStudentsSelectedError,
} from '@application/use-cases/assignments/AssignmentErrors';

const assignSchema = z.object({
  tutorId: z.string().uuid('El tutor debe ser un UUID válido'),
  studentIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un estudiante'),
});

export class AssignmentController {
  constructor(
    private readonly assignStudentsUseCase: AssignStudentsUseCase,
    private readonly getTutorWorkloadUseCase: GetTutorWorkloadUseCase,
  ) {}

  assign = async (req: Request, res: Response) => {
    try {
      const data = assignSchema.parse(req.body);
      const result = await this.assignStudentsUseCase.execute(data);
      res.status(200).json({
        message: `Se asignaron ${result.assigned} estudiante(s) al tutor`,
        ...result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof NoStudentsSelectedError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof TutorNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  workload = async (_req: Request, res: Response) => {
    try {
      const tutors = await this.getTutorWorkloadUseCase.execute();
      res.status(200).json({ tutors });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
