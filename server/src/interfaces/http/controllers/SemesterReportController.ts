import { Request, Response } from 'express';
import { z } from 'zod';
import { GetMySemesterReportUseCase } from '@application/use-cases/semester-reports/GetMySemesterReportUseCase';
import { SaveMySemesterReportUseCase } from '@application/use-cases/semester-reports/SaveMySemesterReportUseCase';
import { GetSemesterReportForExportUseCase } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';
import { SemesterReportNotFoundError } from '@application/use-cases/semester-reports/SemesterReportErrors';
import { TutorNotFoundError } from '@application/use-cases/assignments/AssignmentErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { SemesterReportPdf } from '../../../infrastructure/parsers/SemesterReportPdf';
import { saveSemesterReportSchema } from '../validators/semesterReport.validators';

export class SemesterReportController {
  constructor(
    private readonly getMySemesterReportUseCase: GetMySemesterReportUseCase,
    private readonly saveMySemesterReportUseCase: SaveMySemesterReportUseCase,
    private readonly getSemesterReportForExportUseCase: GetSemesterReportForExportUseCase,
    private readonly pdf: SemesterReportPdf,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof TutorNotFoundError || error instanceof SemesterReportNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof NoActivePeriodError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Informe de implementación de la tutoría semestral (HU-43, Anexo N°9):
  // siempre del tutor autenticado.
  getMine = async (req: Request, res: Response) => {
    try {
      const view = await this.getMySemesterReportUseCase.execute(req.auth?.sub as string);
      res.status(200).json(view);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  saveMine = async (req: Request, res: Response) => {
    try {
      const content = saveSemesterReportSchema.parse(req.body);
      const report = await this.saveMySemesterReportUseCase.execute(req.auth?.sub as string, content);
      res.status(200).json({ message: 'Informe semestral guardado', report });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadMinePdf = async (req: Request, res: Response) => {
    try {
      const data = await this.getSemesterReportForExportUseCase.execute(req.auth?.sub as string);
      const buffer = await this.pdf.build(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="informe-tutoria-semestral.pdf"');
      res.status(200).send(buffer);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
