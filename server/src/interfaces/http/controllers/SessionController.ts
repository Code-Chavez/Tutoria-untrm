import { Request, Response } from 'express';
import { z } from 'zod';
import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import { ListSessionsUseCase } from '@application/use-cases/sessions/ListSessionsUseCase';
import { RegisterAttendanceUseCase } from '@application/use-cases/sessions/RegisterAttendanceUseCase';
import {
  TutorScheduleConflictError,
  LocationRequiredError,
  MeetingLinkRequiredError,
  SessionNotFoundError,
  NotSessionTutorError,
  GroupSessionAttendanceError,
  SessionNotStartedError,
  AttendanceAlreadyRegisteredError,
  AttendanceLimitReachedError,
} from '@application/use-cases/sessions/SessionErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { scheduleSessionSchema } from '../validators/session.validators';

export class SessionController {
  constructor(
    private readonly scheduleSessionUseCase: ScheduleSessionUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly registerAttendanceUseCase: RegisterAttendanceUseCase,
  ) {}

  // Registra la asistencia de una sesión individual (HU-22, Anexo N°4).
  registerAttendance = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const tutorId = req.auth?.sub as string; // authenticate() garantiza req.auth
      const session = await this.registerAttendanceUseCase.execute(sessionId, tutorId);
      res.status(201).json({ message: 'Asistencia registrada exitosamente', session });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof NotSessionTutorError) {
        res.status(403).json({ error: error.message });
      } else if (
        error instanceof GroupSessionAttendanceError ||
        error instanceof SessionNotStartedError
      ) {
        res.status(400).json({ error: error.message });
      } else if (
        error instanceof AttendanceAlreadyRegisteredError ||
        error instanceof AttendanceLimitReachedError
      ) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = scheduleSessionSchema.parse(req.body);
      const tutorId = req.auth?.sub as string; // authenticate() garantiza req.auth; sessions:write es exclusivo del tutor
      const session = await this.scheduleSessionUseCase.execute(tutorId, data);
      res.status(201).json({ message: 'Sesión programada exitosamente', session });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (
        error instanceof LocationRequiredError ||
        error instanceof MeetingLinkRequiredError
      ) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof TutorScheduleConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const { studentId, mine } = req.query;
      const filters: { studentId?: string; tutorId?: string } = {};
      if (typeof studentId === 'string') filters.studentId = studentId;
      if (mine === 'true') filters.tutorId = req.auth?.sub;

      const sessions = await this.listSessionsUseCase.execute(filters);
      res.status(200).json({ sessions });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}
