import { Request, Response } from 'express';
import { z } from 'zod';
import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import { ListSessionsUseCase } from '@application/use-cases/sessions/ListSessionsUseCase';
import { RegisterAttendanceUseCase } from '@application/use-cases/sessions/RegisterAttendanceUseCase';
import { RescheduleSessionUseCase } from '@application/use-cases/sessions/RescheduleSessionUseCase';
import { CancelSessionUseCase } from '@application/use-cases/sessions/CancelSessionUseCase';
import { UploadSessionEvidenceUseCase } from '@application/use-cases/sessions/UploadSessionEvidenceUseCase';
import { ListSessionEvidenceUseCase } from '@application/use-cases/sessions/ListSessionEvidenceUseCase';
import { GetSessionEvidenceFileUseCase } from '@application/use-cases/sessions/GetSessionEvidenceFileUseCase';
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
  SessionAlreadyCancelledError,
  SessionAlreadyCompletedError,
  ChangeReasonRequiredError,
  SessionEvidenceNotFoundError,
} from '@application/use-cases/sessions/SessionErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import {
  scheduleSessionSchema,
  rescheduleSessionSchema,
  cancelSessionSchema,
} from '../validators/session.validators';

export class SessionController {
  constructor(
    private readonly scheduleSessionUseCase: ScheduleSessionUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly registerAttendanceUseCase: RegisterAttendanceUseCase,
    private readonly rescheduleSessionUseCase: RescheduleSessionUseCase,
    private readonly cancelSessionUseCase: CancelSessionUseCase,
    private readonly uploadSessionEvidenceUseCase: UploadSessionEvidenceUseCase,
    private readonly listSessionEvidenceUseCase: ListSessionEvidenceUseCase,
    private readonly getSessionEvidenceFileUseCase: GetSessionEvidenceFileUseCase,
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
        error instanceof AttendanceLimitReachedError ||
        error instanceof SessionAlreadyCancelledError
      ) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Reprograma una sesión con motivo obligatorio (HU-23).
  reschedule = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const data = rescheduleSessionSchema.parse(req.body);
      const tutorId = req.auth?.sub as string;
      const session = await this.rescheduleSessionUseCase.execute(sessionId, tutorId, data);
      res.status(200).json({ message: 'Sesión reprogramada exitosamente', session });
    } catch (error) {
      this.handleChangeError(error, res);
    }
  };

  // Cancela una sesión con motivo obligatorio (HU-23).
  cancel = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const data = cancelSessionSchema.parse(req.body);
      const tutorId = req.auth?.sub as string;
      const session = await this.cancelSessionUseCase.execute(sessionId, tutorId, data);
      res.status(200).json({ message: 'Sesión cancelada exitosamente', session });
    } catch (error) {
      this.handleChangeError(error, res);
    }
  };

  private handleChangeError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof SessionNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof NotSessionTutorError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof ChangeReasonRequiredError) {
      res.status(400).json({ error: error.message });
    } else if (
      error instanceof SessionAlreadyCancelledError ||
      error instanceof SessionAlreadyCompletedError ||
      error instanceof TutorScheduleConflictError
    ) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

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

  // Adjunta una evidencia (PDF o imagen) a la sesión (HU-25).
  uploadEvidence = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const tutorId = req.auth?.sub as string;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Debe adjuntar un archivo PDF o imagen en el campo «file»' });
        return;
      }
      const evidence = await this.uploadSessionEvidenceUseCase.execute(sessionId, tutorId, {
        fileBuffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      });
      res.status(201).json({ message: 'Evidencia registrada exitosamente', evidence });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof NotSessionTutorError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Lista las evidencias de una sesión, con quién la subió (HU-25).
  listEvidence = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const evidences = await this.listSessionEvidenceUseCase.execute(sessionId);
      res.status(200).json({ evidences });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Descarga el archivo de una evidencia (HU-25); el acceso ya quedó
  // controlado por sessions:read en la ruta.
  downloadEvidence = async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id as string;
      const evidenceId = req.params.evidenceId as string;
      const { evidence, absolutePath } = await this.getSessionEvidenceFileUseCase.execute(
        sessionId,
        evidenceId,
      );
      res.download(absolutePath, evidence.fileName);
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionEvidenceNotFoundError) {
        res.status(404).json({ error: error.message });
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
