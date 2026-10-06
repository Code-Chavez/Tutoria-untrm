// Catálogos maestros del sistema (HU-48).
export const CATALOG_KINDS = ['faculties', 'schools', 'periods', 'cycles', 'services', 'motives'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const isCatalogKind = (value: string): value is CatalogKind =>
  (CATALOG_KINDS as readonly string[]).includes(value);

/** Un elemento de cualquier catálogo, con los campos propios de cada tipo (el resto en null). */
export interface CatalogEntry {
  id: string;
  kind: CatalogKind;
  name: string;
  isActive: boolean;
  /** Ciclos, servicios y motivos: el valor que referencian los demás datos (no se edita). */
  code: string | null;
  /** Solo escuelas. */
  facultyId: string | null;
  /** Solo periodos. */
  startDate: Date | null;
  endDate: Date | null;
  /** Cuántos registros del sistema lo usan hoy; si es mayor que 0 no se puede eliminar. */
  usage: number;
}

export interface CatalogInput {
  name: string;
  isActive?: boolean;
  code?: string;
  facultyId?: string;
  startDate?: Date;
  endDate?: Date;
}
