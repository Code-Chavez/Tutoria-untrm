import { Request, Response } from 'express';
import { z } from 'zod';
import { ListWorkPlansUseCase } from '@application/use-cases/work-plans/ListWorkPlansUseCase';
import { GetWorkPlanUseCase } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { SaveWorkPlanUseCase } from '@application/use-cases/work-plans/SaveWorkPlanUseCase';
import { UploadWorkPlanResolutionUseCase } from '@application/use-cases/work-plans/UploadWorkPlanResolutionUseCase';
import { GetWorkPlanResolutionFileUseCase } from '@application/use-cases/work-plans/GetWorkPlanResolutionFileUseCase';
import {
  ListWorkPlanVersionsUseCase,
  GetWorkPlanVersionResolutionFileUseCase,
} from '@application/use-cases/work-plans/WorkPlanVersionUseCases';
import {
  WorkPlanForbiddenError,
  WorkPlanNotFoundError,
  WorkPlanResolutionNotFoundError,
  WorkPlanVersionNotFoundError,
} from '@application/use-cases/work-plans/WorkPlanErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { saveWorkPlanSchema } from '../validators/workPlan.validators';

export class WorkPlanController {
  constructor(
    private readonly listWorkPlansUseCase: ListWorkPlansUseCase,
    private readonly getWorkPlanUseCase: GetWorkPlanUseCase,
    private readonly saveWorkPlanUseCase: SaveWorkPlanUseCase,
    private readonly uploadWorkPlanResolutionUseCase: UploadWorkPlanResolutionUseCase,
    private readonly getWorkPlanResolutionFileUseCase: GetWorkPlanResolutionFileUseCase,
    private readonly listWorkPlanVersionsUseCase: ListWorkPlanVersionsUseCase,
    private readonly getWorkPlanVersionResolutionFileUseCase: GetWorkPlanVersionResolutionFileUseCase,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof WorkPlanForbiddenError) {
      res.status(403).json({ error: error.message });
    } else if (
      error instanceof WorkPlanNotFoundError ||
      error instanceof WorkPlanResolutionNotFoundError ||
      error instanceof WorkPlanVersionNotFoundError
    ) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof NoActivePeriodError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Plan de trabajo semestral (HU-41, Anexo N°8, Art. 17.a).
  list = async (req: Request, res: Response) => {
    try {
      const overview = await this.listWorkPlansUseCase.execute(req.auth?.sub as string);
      res.status(200).json(overview);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const view = await this.getWorkPlanUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
      );
      res.status(200).json(view);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  save = async (req: Request, res: Response) => {
    try {
      const content = saveWorkPlanSchema.parse(req.body);
      const plan = await this.saveWorkPlanUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
        content,
      );
      res.status(200).json({ message: 'Plan de trabajo guardado', plan });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Resolución de aprobación del plan (HU-42): sin ella el plan no es vigente.
  uploadResolution = async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Debe adjuntar la resolución en PDF en el campo «file»' });
        return;
      }
      const plan = await this.uploadWorkPlanResolutionUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
        { fileBuffer: file.buffer, fileName: file.originalname, fileSize: file.size },
      );
      res.status(200).json({ message: 'Resolución de aprobación registrada', plan });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadResolution = async (req: Request, res: Response) => {
    try {
      const { fileName, absolutePath } = await this.getWorkPlanResolutionFileUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
      );
      res.download(absolutePath, fileName);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Versiones aprobadas archivadas al revisar un plan ya aprobado (A12).
  listVersions = async (req: Request, res: Response) => {
    try {
      const versions = await this.listWorkPlanVersionsUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
      );
      res.json(versions);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  downloadVersionResolution = async (req: Request, res: Response) => {
    try {
      const revision = Number(req.params.revision);
      if (!Number.isInteger(revision) || revision < 1) throw new WorkPlanVersionNotFoundError();
      const { fileName, absolutePath } = await this.getWorkPlanVersionResolutionFileUseCase.execute(
        req.auth?.sub as string,
        req.params.schoolId as string,
        revision,
      );
      res.download(absolutePath, fileName);
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
