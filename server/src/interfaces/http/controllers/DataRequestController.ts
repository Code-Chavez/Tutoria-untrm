import { Request, Response } from 'express';
import { z } from 'zod';
import {
  DataRequestNotFoundError,
  InvalidDataRequestError,
  ListDataRequestsUseCase,
  MarkDataRequestReceivedUseCase,
  NoPeriodToRequestError,
  RequestEmailNotConfiguredError,
  SendDataRequestUseCase,
  SetSchoolRequestEmailUseCase,
  TeacherListForbiddenError,
} from '@application/use-cases/data-requests/DataRequestUseCases';
import { SchoolNotFoundError, StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

const sendSchema = z.object({
  schoolId: z.string().uuid('La escuela indicada no es válida'),
  cycles: z.array(z.coerce.number().int().min(1).max(14)).max(14).optional(),
  note: z.string().trim().max(500, 'Las observaciones no pueden pasar de 500 caracteres').optional(),
  kind: z.enum(['ESTUDIANTES', 'DOCENTES']).optional(),
});
const emailSchema = z.object({ email: z.string().trim().max(254).nullable() });

export class DataRequestController {
  constructor(
    private readonly send: SendDataRequestUseCase,
    private readonly list: ListDataRequestsUseCase,
    private readonly received: MarkDataRequestReceivedUseCase,
    private readonly setEmail: SetSchoolRequestEmailUseCase,
  ) {}

  private fail(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? 'Datos de entrada inválidos', details: error.issues });
    } else if (error instanceof StudentAccessDeniedError) {
      res.status(403).json({ error: 'No tienes acceso a esa escuela' });
    } else if (error instanceof SchoolNotFoundError || error instanceof DataRequestNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof RequestEmailNotConfiguredError) {
      res.status(409).json({ error: error.message, code: 'REQUEST_EMAIL_NOT_CONFIGURED' });
    } else if (error instanceof NoPeriodToRequestError) {
      res.status(409).json({ error: error.message, code: 'NO_OPEN_PERIOD' });
    } else if (error instanceof TeacherListForbiddenError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof InvalidDataRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const request = await this.send.execute(req.auth?.sub as string, sendSchema.parse(req.body), req.ip);
      res.status(request.status === 'ENVIADO' ? 201 : 502).json({ message: request.status === 'ENVIADO' ? 'Pedido enviado' : 'El pedido quedó registrado pero el correo no salió', request });
    } catch (error) {
      this.fail(error, res);
    }
  };

  index = async (req: Request, res: Response) => {
    try {
      res.status(200).json({ requests: await this.list.execute(req.auth?.sub as string) });
    } catch (error) {
      this.fail(error, res);
    }
  };

  markReceived = async (req: Request, res: Response) => {
    try {
      res.status(200).json({ request: await this.received.execute(req.auth?.sub as string, req.params.id as string) });
    } catch (error) {
      this.fail(error, res);
    }
  };

  setRequestEmail = async (req: Request, res: Response) => {
    try {
      const { email } = emailSchema.parse(req.body);
      res.status(200).json({ requestEmail: await this.setEmail.execute(req.auth?.sub as string, req.params.id as string, email, req.ip) });
    } catch (error) {
      this.fail(error, res);
    }
  };
}
