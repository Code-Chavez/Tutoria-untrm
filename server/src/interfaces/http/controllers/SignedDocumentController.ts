import { Request, Response } from 'express';
import { z } from 'zod';
import {
  AttachReferralSignedDocumentUseCase,
  ListReferralSignedDocumentsUseCase,
} from '@application/use-cases/signed-documents/ReferralSignedDocumentUseCases';
import {
  AttachAttendanceSheetSignedDocumentUseCase,
  GetAttendanceSheetUseCase,
  ListAttendanceSheetSignedDocumentsUseCase,
} from '@application/use-cases/signed-documents/AttendanceSheetUseCases';
import { GetSignedDocumentFileUseCase } from '@application/use-cases/signed-documents/GetSignedDocumentFileUseCase';
import {
  AttendanceSheetPeriodNotFoundError,
  SignedDocumentNotFoundError,
} from '@application/use-cases/signed-documents/SignedDocumentErrors';
import { ReferralForbiddenError, ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentAccessDeniedError, StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { AttendanceSheetPdf } from '../../../infrastructure/parsers/AttendanceSheetPdf';

const periodQuery = z.object({ periodId: z.string().uuid().optional() });

export class SignedDocumentController {
  constructor(
    private readonly attachReferralDocument: AttachReferralSignedDocumentUseCase,
    private readonly listReferralDocuments: ListReferralSignedDocumentsUseCase,
    private readonly getAttendanceSheet: GetAttendanceSheetUseCase,
    private readonly attachSheetDocument: AttachAttendanceSheetSignedDocumentUseCase,
    private readonly listSheetDocuments: ListAttendanceSheetSignedDocumentsUseCase,
    private readonly getSignedDocumentFile: GetSignedDocumentFileUseCase,
    private readonly sheetPdf: AttendanceSheetPdf,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof ReferralForbiddenError || error instanceof StudentAccessDeniedError) {
      res.status(403).json({ error: error.message });
    } else if (
      error instanceof ReferralNotFoundError ||
      error instanceof StudentNotFoundError ||
      error instanceof SignedDocumentNotFoundError ||
      error instanceof AttendanceSheetPeriodNotFoundError
    ) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  private fileOf(req: Request) {
    const file = req.file;
    if (!file) return null;
    return { fileBuffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype, fileSize: file.size };
  }

  // Constancia de derivación firmada (Anexo N°6).
  attachToReferral = async (req: Request, res: Response) => {
    try {
      const file = this.fileOf(req);
      if (!file) {
        res.status(400).json({ error: 'Adjunta un archivo PDF o imagen (PNG/JPG) de hasta 10 MB' });
        return;
      }
      const document = await this.attachReferralDocument.execute(req.params.id as string, req.auth?.sub as string, file, req.ip);
      res.status(201).json({ message: 'Documento firmado adjuntado', document });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  listForReferral = async (req: Request, res: Response) => {
    try {
      res.status(200).json({ documents: await this.listReferralDocuments.execute(req.params.id as string, req.auth?.sub as string) });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Hoja de asistencia (Anexo N°4): PDF para imprimir y documentos firmados.
  attendanceSheetPdf = async (req: Request, res: Response) => {
    try {
      const { periodId } = periodQuery.parse(req.query);
      const sheet = await this.getAttendanceSheet.execute(req.auth?.sub as string, req.params.id as string, periodId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="hoja-asistencia-anexo-4.pdf"');
      res.status(200).send(await this.sheetPdf.build(sheet));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  attachToAttendanceSheet = async (req: Request, res: Response) => {
    try {
      const { periodId } = periodQuery.parse(req.query);
      const file = this.fileOf(req);
      if (!file) {
        res.status(400).json({ error: 'Adjunta un archivo PDF o imagen (PNG/JPG) de hasta 10 MB' });
        return;
      }
      const document = await this.attachSheetDocument.execute(req.auth?.sub as string, req.params.id as string, file, periodId, req.ip);
      res.status(201).json({ message: 'Documento firmado adjuntado', document });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  listForAttendanceSheet = async (req: Request, res: Response) => {
    try {
      const { periodId } = periodQuery.parse(req.query);
      res.status(200).json(await this.listSheetDocuments.execute(req.auth?.sub as string, req.params.id as string, periodId));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  download = async (req: Request, res: Response) => {
    try {
      const { fileName, absolutePath } = await this.getSignedDocumentFile.execute(req.params.docId as string, req.auth?.sub as string);
      res.download(absolutePath, fileName);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
