import { CatalogEntry, CatalogInput, CatalogKind } from '@domain/entities/Catalog';
import { CatalogRepository } from '@domain/repositories/CatalogRepository';
import {
  CatalogDuplicateError,
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  CatalogValidationError,
} from './CatalogErrors';

/** Elementos de un catálogo con su uso actual (HU-48). */
export class ListCatalogUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  execute(kind: CatalogKind): Promise<CatalogEntry[]> {
    return this.catalogs.list(kind);
  }
}

/** Reglas que dependen del tipo: la facultad de una escuela debe existir y el periodo, fechas coherentes. */
async function assertValid(
  catalogs: CatalogRepository,
  kind: CatalogKind,
  input: Partial<CatalogInput>,
  current?: CatalogEntry,
): Promise<void> {
  if (kind === 'schools' && input.facultyId && !(await catalogs.facultyExists(input.facultyId))) {
    throw new CatalogValidationError('La facultad indicada no existe');
  }
  if (kind === 'periods') {
    const start = input.startDate ?? current?.startDate;
    const end = input.endDate ?? current?.endDate;
    if (start && end && end <= start) {
      throw new CatalogValidationError('La fecha de fin debe ser posterior a la de inicio');
    }
  }
}

/** Solo hay un periodo vigente: para abrir otro hay que cerrar primero el actual en «Cierre de periodo». */
async function assertNoOtherOpenPeriod(catalogs: CatalogRepository, selfId?: string): Promise<void> {
  const open = await catalogs.findActivePeriodId();
  if (open && open !== selfId) {
    throw new CatalogValidationError('Ya hay un periodo vigente: ciérrelo en «Cierre de periodo» antes de abrir otro');
  }
}

/** Alta de un elemento: nombre/código únicos y, para periodos, solo uno activo a la vez. */
export class CreateCatalogEntryUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  async execute(kind: CatalogKind, input: CatalogInput): Promise<CatalogEntry> {
    await assertValid(this.catalogs, kind, input);
    if (kind === 'periods' && input.isActive) await assertNoOtherOpenPeriod(this.catalogs);
    if (await this.catalogs.isDuplicate(kind, input)) throw new CatalogDuplicateError();

    const created = await this.catalogs.create(kind, input);
    if (kind === 'periods' && created.isActive) {
      await this.catalogs.activateOnlyPeriod(created.id);
    }
    return created;
  }
}

/**
 * Edición: el código (ciclos, servicios y motivos) no cambia porque los demás
 * datos lo referencian. Activar un periodo desactiva los demás.
 */
export class UpdateCatalogEntryUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  async execute(kind: CatalogKind, id: string, input: Partial<CatalogInput>): Promise<CatalogEntry> {
    const current = await this.catalogs.findById(kind, id);
    if (!current) throw new CatalogEntryNotFoundError();

    const { code: _immutable, ...changes } = input;
    await assertValid(this.catalogs, kind, changes, current);
    if (kind === 'periods') {
      // Un periodo se termina con su cierre (resumen, matrícula congelada, solo lectura), no apagando una casilla.
      if (changes.isActive === false && current.isActive) {
        throw new CatalogValidationError('Para terminar el periodo vigente use «Cierre de periodo»');
      }
      if (changes.isActive === true && !current.isActive) await assertNoOtherOpenPeriod(this.catalogs, id);
    }
    if (
      (changes.name !== undefined || changes.facultyId !== undefined) &&
      (await this.catalogs.isDuplicate(
        kind,
        {
          name: changes.name ?? current.name,
          code: current.code ?? undefined,
          facultyId: changes.facultyId ?? current.facultyId ?? undefined,
        },
        id,
      ))
    ) {
      throw new CatalogDuplicateError();
    }

    const updated = await this.catalogs.update(kind, id, changes);
    if (kind === 'periods' && changes.isActive === true) {
      await this.catalogs.activateOnlyPeriod(id);
    }
    return updated;
  }
}

/** Baja física solo si nada lo usa; si está en uso se debe desactivar (control de uso, HU-48). */
export class DeleteCatalogEntryUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  async execute(kind: CatalogKind, id: string): Promise<void> {
    const current = await this.catalogs.findById(kind, id);
    if (!current) throw new CatalogEntryNotFoundError();
    if (current.usage > 0) throw new CatalogEntryInUseError(current.usage);
    await this.catalogs.delete(kind, id);
  }
}
