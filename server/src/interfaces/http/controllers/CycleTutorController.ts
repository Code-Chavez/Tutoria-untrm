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
import {
  DeclineNoticeAlreadySentError,
  DeclineNoticeConfirmationRequiredError,
  DeclineNoticeDeliveryDisabledError,
  DeclineNoticeInFlightError,
  DeclineNoticeNotRejectedError,
  NoEnabledRecipientError,
  NoticeOperationConflictError,
  ResendDeclineNoticeUseCase,
} from '@application/use-cases/cycle-tutors/ResendDeclineNoticeUseCase';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

const setSchema = z.object({
  tutorId: z.string().uuid('El tutor debe ser un UUID válido'),
  isException: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
});

const resendNoticeSchema = z.object({
  // Obligatorio: sin él no hay forma de reconocer una repetición (p. ej. tras perder la respuesta).
  operationId: z.uuid({ error: (issue) => (issue.input === undefined ? 'Falta el identificador de la operación (operationId)' : 'El identificador de la operación no es válido') }),
  // Intento anterior que la persona vio y confirma reenviar (solo cuando su resultado es incierto o no hay registro).
  confirmPrevious: z.object({ attemptId: z.uuid('El intento a confirmar no es válido').nullable() }).optional(),
});

export class CycleTutorController {
  constructor(
    private readonly list: ListCycleTutorsUseCase,
    private readonly setTutor: SetCycleTutorUseCase,
    private readonly removeTutor: RemoveCycleTutorUseCase,
    private readonly requestAcceptance: RequestTutorAcceptanceUseCase,
    private readonly resendNotice: ResendDeclineNoticeUseCase,
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

  /** Reenvía solo el aviso a la coordinación del rechazo de un docente (no toca el rechazo). */
  resendDeclineNotice = async (req: Request, res: Response) => {
    try {
      const body = resendNoticeSchema.parse(req.body);
      const { attempt, recipientName, replayed } = await this.resendNotice.execute(req.auth?.sub as string, req.params.schoolId as string, Number(req.params.cycle), body, req.ip);
      // 201 aceptado por el servidor de correo; 200 repetición de una operación ya guardada (no se envía otra vez) o sin envío;
      // 202 registrado pero el resultado es incierto o el envío sigue en curso; 502 el servidor de correo no lo aceptó.
      const status = replayed ? 200 : attempt.status === 'ENVIADO' ? 201 : attempt.status === 'FALLIDO' ? 502 : attempt.status === 'INCIERTO' || attempt.status === 'EN_COLA' || attempt.status === 'ENVIANDO' ? 202 : 200;
      res.status(status).json({
        attempt: { id: attempt.id, status: attempt.status, kind: attempt.kind, at: (attempt.finishedAt ?? attempt.startedAt ?? attempt.createdAt).toISOString(), recipientName },
        replayed,
      });
    } catch (error) {
      // La validación del cuerpo explica qué falta (p. ej. el operationId) en lugar de un mensaje genérico.
      if (error instanceof z.ZodError) res.status(400).json({ error: error.issues[0]?.message ?? 'Datos de entrada inválidos', details: error.issues });
      else this.fail(res, error);
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
    if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
    else if (error instanceof InvalidCycleError || error instanceof CycleExceptionError) res.status(400).json({ error: error.message });
    else if (error instanceof StudentAccessDeniedError) res.status(403).json({ error: error.message });
    else if (error instanceof TutorNotFoundError || error instanceof CycleTutorSchoolNotFoundError || error instanceof CycleTutorNotFoundError) res.status(404).json({ error: error.message });
    else if (error instanceof TutorSchoolMismatchError || error instanceof NoPeriodForCycleTutorsError) res.status(409).json({ error: error.message });
    else if (error instanceof DeclineNoticeNotRejectedError) res.status(409).json({ error: error.message, code: 'DECLINE_NOT_REJECTED' });
    else if (error instanceof DeclineNoticeInFlightError) res.status(409).json({ error: error.message, code: 'DECLINE_NOTICE_IN_FLIGHT', previous: error.previous });
    else if (error instanceof DeclineNoticeAlreadySentError) res.status(409).json({ error: error.message, code: 'DECLINE_NOTICE_ALREADY_SENT', previous: error.previous });
    else if (error instanceof DeclineNoticeConfirmationRequiredError) res.status(409).json({ error: error.message, code: 'CONFIRMATION_REQUIRED', previous: error.previous });
    else if (error instanceof NoEnabledRecipientError) res.status(409).json({ error: error.message, code: 'NO_ENABLED_RECIPIENT' });
    else if (error instanceof DeclineNoticeDeliveryDisabledError) res.status(409).json({ error: error.message, code: 'DELIVERY_DISABLED' });
    else if (error instanceof NoticeOperationConflictError) res.status(422).json({ error: error.message, code: 'OPERATION_ID_CONFLICT' });
    else if (error instanceof TutorAlreadyHasCycleError) res.status(409).json({ error: error.message, code: 'TUTOR_HAS_CYCLE', otherCycles: error.otherCycles });
    else res.status(500).json({ error: 'Error interno del servidor' });
  }
}
