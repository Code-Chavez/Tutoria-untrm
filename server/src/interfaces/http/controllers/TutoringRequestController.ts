import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import { ListTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';
import {
  InstructorDetailsRequiredError,
  NoRoutingTargetError,
} from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { createTutoringRequestSchema } from '../validators/tutoringRequest.validators';

export class TutoringRequestController {
  constructor(
    private readonly createTutoringRequestUseCase: CreateTutoringRequestUseCase,
    private readonly listTutoringRequestsUseCase: ListTutoringRequestsUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = createTutoringRequestSchema.parse(req.body);
      const requestedById = req.auth?.sub as string; // authenticate() garantiza req.auth
      const request = await this.createTutoringRequestUseCase.execute(
        studentId,
        requestedById,
        data,
      );
      res.status(201).json({ message: 'Solicitud de tutoría registrada exitosamente', request });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof InstructorDetailsRequiredError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof NoRoutingTargetError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const { studentId, mine } = req.query;
      const filters: { studentId?: string; routedToId?: string } = {};
      if (typeof studentId === 'string') filters.studentId = studentId;
      if (mine === 'true') filters.routedToId = req.auth?.sub;

      const requests = await this.listTutoringRequestsUseCase.execute(filters);
      res.status(200).json({ requests });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
