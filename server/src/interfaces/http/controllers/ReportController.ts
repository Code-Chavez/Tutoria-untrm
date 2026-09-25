import { Request, Response } from 'express';
import { GetScheduleAttendanceReportUseCase } from '@application/use-cases/reports/GetScheduleAttendanceReportUseCase';
import { ScheduleAttendanceReportWorkbook } from '@infrastructure/parsers/ScheduleAttendanceReportWorkbook';
import { ScheduleAttendanceReportPdf } from '@infrastructure/parsers/ScheduleAttendanceReportPdf';
import { TutorNotFoundError } from '@application/use-cases/assignments/AssignmentErrors';
import { GetScheduleAttendanceReportInput } from '@application/dtos/report.dto';

export class ReportController {
  constructor(
    private readonly getScheduleAttendanceReportUseCase: GetScheduleAttendanceReportUseCase,
    private readonly workbook: ScheduleAttendanceReportWorkbook,
    private readonly pdf: ScheduleAttendanceReportPdf,
  ) {}

  // Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d).
  // ?mine=true usa al tutor autenticado; si no, requiere ?tutorId= (Coordinador).
  private resolveInput(req: Request): GetScheduleAttendanceReportInput | null {
    const tutorId = req.query.mine === 'true' ? (req.auth?.sub as string) : (req.query.tutorId as string | undefined);
    if (!tutorId) return null;
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
    return { tutorId, from, to };
  }

  getReport = async (req: Request, res: Response) => {
    try {
      const input = this.resolveInput(req);
      if (!input) {
        res.status(400).json({ error: 'Debe indicar ?mine=true o ?tutorId=' });
        return;
      }
      const report = await this.getScheduleAttendanceReportUseCase.execute(input);
      res.status(200).json({ report });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadExcel = async (req: Request, res: Response) => {
    try {
      const input = this.resolveInput(req);
      if (!input) {
        res.status(400).json({ error: 'Debe indicar ?mine=true o ?tutorId=' });
        return;
      }
      const report = await this.getScheduleAttendanceReportUseCase.execute(input);
      const buffer = await this.workbook.build(report);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="consolidado-horarios-asistencia.xlsx"',
      );
      res.status(200).send(buffer);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadPdf = async (req: Request, res: Response) => {
    try {
      const input = this.resolveInput(req);
      if (!input) {
        res.status(400).json({ error: 'Debe indicar ?mine=true o ?tutorId=' });
        return;
      }
      const report = await this.getScheduleAttendanceReportUseCase.execute(input);
      const buffer = await this.pdf.build(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="consolidado-horarios-asistencia.pdf"',
      );
      res.status(200).send(buffer);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response) {
    if (error instanceof TutorNotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
