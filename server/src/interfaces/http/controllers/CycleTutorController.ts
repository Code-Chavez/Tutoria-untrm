import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CycleExceptionError,
  CycleTutorSchoolNotFoundError,
  InvalidCycleError,
  ListCycleTutorsUseCase,
  NoPeriodForCycleTutorsError,
  RemoveCycleTutorUseCase,
  SetCycleTutorUseCase,
  TutorAlreadyHasCycleError,
} from '@application/use-cases/cycle-tutors/CycleTutorUseCases';
import { CycleTutorNotFoundError, RequestTutorAcceptanceUseCase } from '@application/use-cases/cycle-tutors/TutorAcceptanceUseCases';
import { TutorNotFoundError, TutorSchoolMismatchError } from '@application/use-cases/assignments/AssignmentErrors';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

const setSchema = z.object({
  tutorId: z.string().uuid('El tutor debe ser un UUID válido'),
  isException: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

export class CycleTutorController {
  constructor(
    private readonly list: ListCycleTutorsUseCase,
    private readonly setTutor: SetCycleTutorUseCase,
    private readonly removeTutor: RemoveCycleTutorUseCase,
    private readonly requestAcceptance: RequestTutorAcceptanceUseCase,
  ) {}

  index = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.list.execute(req.auth?.sub as string, req.params.schoolId as string));
    } catch (error) {
      this.fail(res, error);
    }
  };

  set = async (req: Request, res: Response) => {
    try {
      const body = setSchema.parse(req.body);
      const result = await this.setTutor.execute(
        req.auth?.sub as string,
        { schoolId: req.params.schoolId as string, cycle: Number(req.params.cycle), ...body },
        req.ip,
      );
      // Un docente nuevo en el ciclo recibe de inmediato el correo para aceptar o rechazar; el mismo docente conserva su respuesta.
      const acceptance =
        result.assignment.acceptanceStatus === 'SIN_SOLICITAR'
          ? await this.requestAcceptance.execute(req.auth?.sub as string, req.params.schoolId as string, Number(req.params.cycle), req.ip)
          : null;
      res.status(200).json({ ...result, acceptanceEmailSent: acceptance?.emailSent ?? null });
    } catch (error) {
      this.fail(res, error);
    }
  };

  resend = async (req: Request, res: Response) => {
    try {
      res.status(200).json(await this.requestAcceptance.execute(req.auth?.sub as string, req.params.schoolId as string, Number(req.params.cycle), req.ip));
    } catch (error) {
      this.fail(res, error);
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const removed = await this.removeTutor.execute(req.auth?.sub as string, req.params.schoolId as string, Number(req.params.cycle), req.ip);
      res.status(removed ? 200 : 404).json({ removed });
    } catch (error) {
      this.fail(res, error);
    }
  };

  private fail(res: Response, error: unknown) {
    if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    else if (error instanceof InvalidCycleError || error instanceof CycleExceptionError) res.status(400).json({ error: error.message });
    else if (error instanceof StudentAccessDeniedError) res.status(403).json({ error: error.message });
    else if (error instanceof TutorNotFoundError || error instanceof CycleTutorSchoolNotFoundError || error instanceof CycleTutorNotFoundError) res.status(404).json({ error: error.message });
    else if (error instanceof TutorSchoolMismatchError || error instanceof NoPeriodForCycleTutorsError) res.status(409).json({ error: error.message });
    else if (error instanceof TutorAlreadyHasCycleError) res.status(409).json({ error: error.message, code: 'TUTOR_HAS_CYCLE', otherCycles: error.otherCycles });
    else res.status(500).json({ error: 'Error interno del servidor' });
  }
}
