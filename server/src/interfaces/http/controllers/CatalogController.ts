import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogInput, CatalogKind, isCatalogKind } from '@domain/entities/Catalog';
import {
  CreateCatalogEntryUseCase,
  DeleteCatalogEntryUseCase,
  ListCatalogUseCase,
  UpdateCatalogEntryUseCase,
} from '@application/use-cases/catalogs/CatalogUseCases';
import {
  CatalogDuplicateError,
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  CatalogValidationError,
} from '@application/use-cases/catalogs/CatalogErrors';
import { catalogCreateSchema, catalogUpdateSchema } from '../validators/catalog.validators';

export class CatalogController {
  constructor(
    private readonly listCatalogUseCase: ListCatalogUseCase,
    private readonly createCatalogEntryUseCase: CreateCatalogEntryUseCase,
    private readonly updateCatalogEntryUseCase: UpdateCatalogEntryUseCase,
    private readonly deleteCatalogEntryUseCase: DeleteCatalogEntryUseCase,
  ) {}

  private kind(req: Request, res: Response): CatalogKind | null {
    const type = req.params.type as string;
    if (!isCatalogKind(type)) {
      res.status(404).json({ error: 'Catálogo desconocido' });
      return null;
    }
    return type;
  }

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof CatalogValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof CatalogEntryNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof CatalogDuplicateError || error instanceof CatalogEntryInUseError) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Catálogos maestros (HU-48): facultades, escuelas, periodos, ciclos, servicios y motivos.
  list = async (req: Request, res: Response) => {
    const kind = this.kind(req, res);
    if (!kind) return;
    try {
      res.status(200).json({ entries: await this.listCatalogUseCase.execute(kind) });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  create = async (req: Request, res: Response) => {
    const kind = this.kind(req, res);
    if (!kind) return;
    try {
      const input = catalogCreateSchema(kind).parse(req.body) as CatalogInput;
      const entry = await this.createCatalogEntryUseCase.execute(kind, input);
      res.status(201).json({ message: 'Elemento creado', entry });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response) => {
    const kind = this.kind(req, res);
    if (!kind) return;
    try {
      const input = catalogUpdateSchema(kind).parse(req.body) as Partial<CatalogInput>;
      const entry = await this.updateCatalogEntryUseCase.execute(kind, req.params.id as string, input);
      res.status(200).json({ message: 'Elemento actualizado', entry });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  remove = async (req: Request, res: Response) => {
    const kind = this.kind(req, res);
    if (!kind) return;
    try {
      await this.deleteCatalogEntryUseCase.execute(kind, req.params.id as string);
      res.status(200).json({ message: 'Elemento eliminado' });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
