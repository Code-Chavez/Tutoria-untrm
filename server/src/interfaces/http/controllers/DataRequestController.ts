import { Request, Response } from 'express';
import { z } from 'zod';
import {
  DataRequestInFlightError,
  DataRequestNotFoundError,
  DuplicateDataRequestError,
  InvalidDataRequestError,
  ListDataRequestsUseCase,
  MarkDataRequestReceivedUseCase,
  NoPeriodToRequestError,
  OperationIdConflictError,
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
  // Idempotencia y reenvío confirmado (LEV-R04).
  // Obligatorio: sin él no hay forma de reconocer una repetición. Se rechaza la petición, no se genera uno en el servidor.
  operationId: z.uuid({ error: (issue) => (issue.input === undefined ? 'Falta el identificador de la operación (operationId): el cliente debe enviarlo para poder reintentar sin duplicar el pedido' : 'El identificador de la operación no es válido') }),
  confirmDuplicateOf: z.string().uuid('El pedido a confirmar no es válido').optional(),
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
    } else if (error instanceof DuplicateDataRequestError) {
      res.status(409).json({ error: error.message, code: 'DUPLICATE_DATA_REQUEST', previous: error.previous });
    } else if (error instanceof DataRequestInFlightError) {
      res.status(409).json({ error: error.message, code: 'DATA_REQUEST_IN_FLIGHT', previous: error.previous });
    } else if (error instanceof OperationIdConflictError) {
      res.status(422).json({ error: error.message, code: 'OPERATION_ID_CONFLICT' });
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
      const { request, replayed } = await this.send.execute(req.auth?.sub as string, sendSchema.parse(req.body), req.ip);
      // 201 creado y enviado; 200 repetición de una operación ya guardada (no se envió nada); 202 registrado con resultado
      // incierto o en curso; 502 registrado pero el correo no fue aceptado.
      const status = replayed ? 200 : request.status === 'ENVIADO' ? 201 : request.status === 'FALLIDO' ? 502 : 202;
      const message = replayed
        ? 'La operación ya estaba registrada; no se envió otro correo'
        : request.status === 'ENVIADO'
          ? 'Pedido enviado'
          : request.status === 'FALLIDO'
            ? 'El pedido quedó registrado pero el correo no salió'
            : 'El pedido quedó registrado pero no se puede saber si el correo salió';
      res.status(status).json({ message, request, replayed });
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
