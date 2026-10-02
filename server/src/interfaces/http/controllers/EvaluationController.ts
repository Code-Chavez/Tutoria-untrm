import { Request, Response } from 'express';
import { z } from 'zod';
import { SubmitEvaluationUseCase } from '@application/use-cases/evaluation/SubmitEvaluationUseCase';
import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { GetEvaluationResultsUseCase } from '@application/use-cases/evaluation/GetEvaluationResultsUseCase';
import { ListEvaluationWindowsUseCase } from '@application/use-cases/evaluation/ListEvaluationWindowsUseCase';
import { SetEvaluationWindowUseCase } from '@application/use-cases/evaluation/SetEvaluationWindowUseCase';
import { GetEvaluationStatisticsUseCase } from '@application/use-cases/evaluation/GetEvaluationStatisticsUseCase';
import { GetEvaluationSuggestionsUseCase } from '@application/use-cases/evaluation/GetEvaluationSuggestionsUseCase';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import {
  NoActivePeriodError,
  EvaluationAlreadySubmittedError,
  TutorNotAssignedError,
  EvaluationNotOpenForSchoolError,
  EvaluationResultsForbiddenError,
  EvaluationWindowForbiddenError,
  TutorNotFoundError,
  SchoolNotFoundError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import { submitEvaluationSchema } from '../validators/evaluation.validators';
import { setEvaluationWindowSchema } from '../validators/evaluationWindow.validators';

export class EvaluationController {
  constructor(
    private readonly submitEvaluationUseCase: SubmitEvaluationUseCase,
    private readonly getEvaluationStatusUseCase: GetEvaluationStatusUseCase,
    private readonly getEvaluationResultsUseCase: GetEvaluationResultsUseCase,
    private readonly listEvaluationWindowsUseCase: ListEvaluationWindowsUseCase,
    private readonly setEvaluationWindowUseCase: SetEvaluationWindowUseCase,
    private readonly getEvaluationStatisticsUseCase: GetEvaluationStatisticsUseCase,
    private readonly getEvaluationSuggestionsUseCase: GetEvaluationSuggestionsUseCase,
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
      } else if (
        error instanceof NoActivePeriodError ||
        error instanceof EvaluationAlreadySubmittedError ||
        error instanceof EvaluationNotOpenForSchoolError
      ) {
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

  // Resultados agregados y anónimos de un tutor (HU-37).
  getResults = async (req: Request, res: Response) => {
    try {
      const requesterId = req.auth?.sub as string;
      const tutorId = req.params.tutorId as string;
      const results = await this.getEvaluationResultsUseCase.execute(requesterId, tutorId);
      res.status(200).json(results);
    } catch (error) {
      if (error instanceof EvaluationResultsForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof TutorNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Configuración de apertura/cierre de la evaluación por escuela (HU-38).
  listWindows = async (req: Request, res: Response) => {
    try {
      const requesterId = req.auth?.sub as string;
      const overview = await this.listEvaluationWindowsUseCase.execute(requesterId);
      res.status(200).json(overview);
    } catch (error) {
      if (error instanceof EvaluationWindowForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  setWindow = async (req: Request, res: Response) => {
    try {
      const requesterId = req.auth?.sub as string;
      const schoolId = req.params.schoolId as string;
      const { isOpen } = setEvaluationWindowSchema.parse(req.body);
      const state = await this.setEvaluationWindowUseCase.execute(requesterId, schoolId, isOpen);
      res.status(200).json(state);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof EvaluationWindowForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof SchoolNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Estadísticas por tutor del periodo activo, filtrables por escuela/facultad (HU-39).
  getStatistics = async (req: Request, res: Response) => {
    try {
      const requesterId = req.auth?.sub as string;
      const schoolId = typeof req.query.schoolId === 'string' ? req.query.schoolId : undefined;
      const facultyId = typeof req.query.facultyId === 'string' ? req.query.facultyId : undefined;
      const report = await this.getEvaluationStatisticsUseCase.execute(requesterId, { schoolId, facultyId });
      res.status(200).json(report);
    } catch (error) {
      if (error instanceof EvaluationResultsForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Sugerencias abiertas consolidadas del periodo activo (HU-40).
  getSuggestions = async (req: Request, res: Response) => {
    try {
      const requesterId = req.auth?.sub as string;
      const tutorId = typeof req.query.tutorId === 'string' ? req.query.tutorId : undefined;
      const schoolId = typeof req.query.schoolId === 'string' ? req.query.schoolId : undefined;
      const facultyId = typeof req.query.facultyId === 'string' ? req.query.facultyId : undefined;
      const report = await this.getEvaluationSuggestionsUseCase.execute(requesterId, {
        tutorId,
        schoolId,
        facultyId,
      });
      res.status(200).json(report);
    } catch (error) {
      if (error instanceof EvaluationResultsForbiddenError) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof NoActivePeriodError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
