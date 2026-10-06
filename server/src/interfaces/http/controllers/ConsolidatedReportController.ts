import { Request, Response } from 'express';
import { GetConsolidatedReportUseCase } from '@application/use-cases/consolidated-reports/GetConsolidatedReportUseCase';
import { ConsolidatedReportForbiddenError } from '@application/use-cases/consolidated-reports/ConsolidatedReportErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { ConsolidatedReportWorkbook } from '../../../infrastructure/parsers/ConsolidatedReportWorkbook';
import { ConsolidatedReportPdf } from '../../../infrastructure/parsers/ConsolidatedReportPdf';

export class ConsolidatedReportController {
  constructor(
    private readonly getConsolidatedReportUseCase: GetConsolidatedReportUseCase,
    private readonly workbook: ConsolidatedReportWorkbook,
    private readonly pdf: ConsolidatedReportPdf,
  ) {}

  private filters(req: Request) {
    const { facultyId, schoolId } = req.query;
    return {
      facultyId: typeof facultyId === 'string' && facultyId ? facultyId : undefined,
      schoolId: typeof schoolId === 'string' && schoolId ? schoolId : undefined,
    };
  }

  private handleError(error: unknown, res: Response) {
    if (error instanceof ConsolidatedReportForbiddenError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof NoActivePeriodError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Informe consolidado por escuela y facultad (HU-44).
  getReport = async (req: Request, res: Response) => {
    try {
      const report = await this.getConsolidatedReportUseCase.execute(
        req.auth?.sub as string,
        this.filters(req),
      );
      res.status(200).json({ report });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadExcel = async (req: Request, res: Response) => {
    try {
      const report = await this.getConsolidatedReportUseCase.execute(
        req.auth?.sub as string,
        this.filters(req),
      );
      const buffer = await this.workbook.build(report);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="consolidado-tutoria.xlsx"');
      res.status(200).send(buffer);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadPdf = async (req: Request, res: Response) => {
    try {
      const report = await this.getConsolidatedReportUseCase.execute(
        req.auth?.sub as string,
        this.filters(req),
      );
      const buffer = await this.pdf.build(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="consolidado-tutoria.pdf"');
      res.status(200).send(buffer);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
