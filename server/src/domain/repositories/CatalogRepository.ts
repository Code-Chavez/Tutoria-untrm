import { CatalogEntry, CatalogInput, CatalogKind } from '../entities/Catalog';

export interface CatalogRepository {
  list(kind: CatalogKind): Promise<CatalogEntry[]>;
  findById(kind: CatalogKind, id: string): Promise<CatalogEntry | null>;
  create(kind: CatalogKind, input: CatalogInput): Promise<CatalogEntry>;
  update(kind: CatalogKind, id: string, input: Partial<CatalogInput>): Promise<CatalogEntry>;
  delete(kind: CatalogKind, id: string): Promise<void>;
  /** ¿Ya existe otro elemento con el mismo nombre (o código, si el tipo lo tiene) en su ámbito? */
  isDuplicate(
    kind: CatalogKind,
    input: Pick<CatalogInput, 'name' | 'code' | 'facultyId'>,
    excludeId?: string,
  ): Promise<boolean>;
  facultyExists(id: string): Promise<boolean>;
  /** Deja un único periodo activo (el indicado); los demás pasan a inactivos. */
  activateOnlyPeriod(id: string): Promise<void>;
}
