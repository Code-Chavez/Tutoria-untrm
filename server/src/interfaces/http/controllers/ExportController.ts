import { Request, Response } from 'express';
import { GetEvaluationStatisticsUseCase } from '@application/use-cases/evaluation/GetEvaluationStatisticsUseCase';
import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { GetWorkPlanUseCase } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { IndicatorsForbiddenError } from '@application/use-cases/indicators/IndicatorsErrors';
import {
  WorkPlanForbiddenError,
  WorkPlanNotFoundError,
} from '@application/use-cases/work-plans/WorkPlanErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import {
  EvaluationResultsForbiddenError,
  NoActivePeriodError,
} from '@application/use-cases/evaluation/EvaluationErrors';
import {
  EvaluationStatisticsPdf,
  EvaluationStatisticsWorkbook,
} from '../../../infrastructure/parsers/EvaluationStatisticsExports';
import { IndicatorsPdf, IndicatorsWorkbook } from '../../../infrastructure/parsers/IndicatorsExports';
import { WorkPlanPdf } from '../../../infrastructure/parsers/WorkPlanPdf';
import { StudentRecordPdf } from '../../../infrastructure/parsers/StudentRecordPdf';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const param = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

type Format = 'pdf' | 'excel';

/**
 * Exportaciones a PDF y Excel de los reportes y fichas del sistema (HU-46):
 * cada ruta reutiliza el mismo caso de uso (y por tanto los mismos permisos,
 * alcance y anonimato) que la consulta en pantalla, y solo cambia el formato.
 */
export class ExportController {
  constructor(
    private readonly getEvaluationStatisticsUseCase: GetEvaluationStatisticsUseCase,
    private readonly getIndicatorsUseCase: GetIndicatorsUseCase,
    private readonly getWorkPlanUseCase: GetWorkPlanUseCase,
    private readonly getStudentRecordUseCase: GetStudentRecordUseCase,
    private readonly evaluationPdf: EvaluationStatisticsPdf,
    private readonly evaluationWorkbook: EvaluationStatisticsWorkbook,
    private readonly indicatorsPdf: IndicatorsPdf,
    private readonly indicatorsWorkbook: IndicatorsWorkbook,
    private readonly workPlanPdf: WorkPlanPdf,
    private readonly studentRecordPdf: StudentRecordPdf,
  ) {}

  private send(res: Response, format: Format, buffer: Buffer, baseName: string) {
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.${format === 'pdf' ? 'pdf' : 'xlsx'}"`);
    res.status(200).send(buffer);
  }

  private handleError(error: unknown, res: Response) {
    if (error instanceof EvaluationResultsForbiddenError || error instanceof IndicatorsForbiddenError || error instanceof WorkPlanForbiddenError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof WorkPlanNotFoundError || error instanceof StudentNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof NoActivePeriodError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  evaluationStatistics = (format: Format) => async (req: Request, res: Response) => {
    try {
      const report = await this.getEvaluationStatisticsUseCase.execute(req.auth?.sub as string, {
        schoolId: param(req.query.schoolId),
        facultyId: param(req.query.facultyId),
      });
      const buffer =
        format === 'pdf' ? await this.evaluationPdf.build(report) : await this.evaluationWorkbook.build(report);
      this.send(res, format, buffer, 'evaluacion-tutoria');
    } catch (error) {
      this.handleError(error, res);
    }
  };

  indicators = (format: Format) => async (req: Request, res: Response) => {
    try {
      const report = await this.getIndicatorsUseCase.execute(req.auth?.sub as string, {
        facultyId: param(req.query.facultyId),
        schoolId: param(req.query.schoolId),
        tutorId: param(req.query.tutorId),
      });
      const buffer =
        format === 'pdf' ? await this.indicatorsPdf.build(report) : await this.indicatorsWorkbook.build(report);
      this.send(res, format, buffer, 'indicadores-tutoria');
    } catch (error) {
      this.handleError(error, res);
    }
  };

  workPlan = async (req: Request, res: Response) => {
    try {
      const view = await this.getWorkPlanUseCase.execute(req.auth?.sub as string, req.params.schoolId as string);
      if (!view.plan) throw new WorkPlanNotFoundError();
      const buffer = await this.workPlanPdf.build({ ...view, plan: view.plan });
      this.send(res, 'pdf', buffer, 'plan-trabajo-semestral');
    } catch (error) {
      this.handleError(error, res);
    }
  };

  studentRecord = async (req: Request, res: Response) => {
    try {
      const includeSupportContact = Boolean(req.permissions?.includes('support-contacts:read'));
      const record = await this.getStudentRecordUseCase.execute(
        req.params.id as string,
        includeSupportContact,
        req.auth?.sub as string,
      );
      this.send(res, 'pdf', await this.studentRecordPdf.build(record), 'expediente-tutorado');
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
