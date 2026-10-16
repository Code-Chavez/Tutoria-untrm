import { Request, Response } from 'express';
import { z } from 'zod';
import {
  CampusNotFoundError,
  CreateCampusUseCase,
  DuplicateCampusError,
  InvalidCampusError,
  ListCampusesUseCase,
  SchoolNotFoundForCampusError,
  SetSchoolCampusUseCase,
  UpdateCampusUseCase,
} from '@application/use-cases/campuses/CampusUseCases';

const nameSchema = z.object({ name: z.string() });
const updateSchema = z.object({ name: z.string().optional(), isActive: z.boolean().optional() });
const schoolCampusSchema = z.object({ campusId: z.string().uuid('La sede debe ser un UUID válido') });

export class CampusController {
  constructor(
    private readonly list: ListCampusesUseCase,
    private readonly createCampus: CreateCampusUseCase,
    private readonly updateCampus: UpdateCampusUseCase,
    private readonly setSchoolCampus: SetSchoolCampusUseCase,
  ) {}

  index = async (_req: Request, res: Response) => {
    try {
      res.status(200).json(await this.list.execute());
    } catch (error) {
      this.fail(res, error);
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name } = nameSchema.parse(req.body);
      const campus = await this.createCampus.execute(req.auth?.sub as string, name, req.ip);
      res.status(201).json({ campus });
    } catch (error) {
      this.fail(res, error);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const changes = updateSchema.parse(req.body);
      const campus = await this.updateCampus.execute(req.auth?.sub as string, req.params.id as string, changes, req.ip);
      res.status(200).json({ campus });
    } catch (error) {
      this.fail(res, error);
    }
  };

  setForSchool = async (req: Request, res: Response) => {
    try {
      const { campusId } = schoolCampusSchema.parse(req.body);
      await this.setSchoolCampus.execute(req.auth?.sub as string, req.params.id as string, campusId, req.ip);
      res.status(200).json({ message: 'Sede de la escuela actualizada', campusId });
    } catch (error) {
      this.fail(res, error);
    }
  };

  private fail(res: Response, error: unknown) {
    if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    else if (error instanceof InvalidCampusError) res.status(400).json({ error: error.message });
    else if (error instanceof DuplicateCampusError) res.status(409).json({ error: error.message });
    else if (error instanceof CampusNotFoundError || error instanceof SchoolNotFoundForCampusError) res.status(404).json({ error: error.message });
    else res.status(500).json({ error: 'Error interno del servidor' });
  }
}
