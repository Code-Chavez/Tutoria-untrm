import { Request, Response } from 'express';
import { z } from 'zod';
import { ListWorkPlansUseCase } from '@application/use-cases/work-plans/ListWorkPlansUseCase';
import { GetWorkPlanUseCase } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { SaveWorkPlanUseCase } from '@application/use-cases/work-plans/SaveWorkPlanUseCase';
import { WorkPlanForbiddenError } from '@application/use-cases/work-plans/WorkPlanErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { saveWorkPlanSchema } from '../validators/workPlan.validators';

export class WorkPlanController {
  constructor(
    private readonly listWorkPlansUseCase: ListWorkPlansUseCase,
    private readonly getWorkPlanUseCase: GetWorkPlanUseCase,
    private readonly saveWorkPlanUseCase: SaveWorkPlanUseCase,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof WorkPlanForbiddenError) {
      res.status(403).json({ error: error.message });
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
}
