import { Request, Response } from 'express';
import { z } from 'zod';
import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import { GetTutorWorkloadUseCase } from '@application/use-cases/assignments/GetTutorWorkloadUseCase';
import { ReassignStudentUseCase } from '@application/use-cases/assignments/ReassignStudentUseCase';
import {
  TutorNotFoundError,
  NoStudentsSelectedError,
  ReassignReasonRequiredError,
  SameTutorAssignmentError,
} from '@application/use-cases/assignments/AssignmentErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

const assignSchema = z.object({
  tutorId: z.string().uuid('El tutor debe ser un UUID válido'),
  studentIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un estudiante'),
});

const reassignSchema = z.object({
  newTutorId: z.string().uuid('El tutor debe ser un UUID válido'),
  reason: z.string().trim().min(3, 'El motivo debe tener al menos 3 caracteres').max(500),
});

export class AssignmentController {
  constructor(
    private readonly assignStudentsUseCase: AssignStudentsUseCase,
    private readonly getTutorWorkloadUseCase: GetTutorWorkloadUseCase,
    private readonly reassignStudentUseCase: ReassignStudentUseCase,
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

  // Reasignación individual de un tutorado (HU-13).
  reassign = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = reassignSchema.parse(req.body);
      const actingUserId = req.auth?.sub as string; // authenticate() garantiza req.auth
      const student = await this.reassignStudentUseCase.execute(studentId, actingUserId, data);
      res.status(200).json({ message: 'Estudiante reasignado exitosamente', student });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof ReassignReasonRequiredError || error instanceof SameTutorAssignmentError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof StudentNotFoundError || error instanceof TutorNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
