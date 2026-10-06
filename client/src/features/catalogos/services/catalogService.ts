import { apiClient } from '@shared/services/apiClient';

// Catálogos maestros (HU-48).
export type CatalogKind = 'faculties' | 'schools' | 'periods' | 'cycles' | 'services' | 'motives';

export interface CatalogEntry {
  id: string;
  kind: CatalogKind;
  name: string;
  isActive: boolean;
  /** Ciclos, servicios y motivos: el valor que referencian los demás datos. */
  code: string | null;
  facultyId: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Registros que lo usan hoy; con uso mayor que 0 no se puede eliminar. */
  usage: number;
}

export interface CatalogInput {
  name?: string;
  isActive?: boolean;
  code?: string;
  facultyId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CatalogDefinition {
  kind: CatalogKind;
  /** Pestaña y título. */
  label: string;
  /** Para los mensajes ("Nueva facultad"). */
  singular: string;
  /** Campo clave que identifica al elemento junto al nombre y no se edita. */
  hasCode: boolean;
  codeLabel?: string;
  codeHint?: string;
}

export const CATALOGS: CatalogDefinition[] = [
  { kind: 'faculties', label: 'Facultades', singular: 'facultad', hasCode: false },
  { kind: 'schools', label: 'Escuelas', singular: 'escuela profesional', hasCode: false },
  { kind: 'periods', label: 'Periodos', singular: 'periodo académico', hasCode: false },
  { kind: 'cycles', label: 'Ciclos', singular: 'ciclo', hasCode: true, codeLabel: 'Número de ciclo', codeHint: 'Del 1 al 14' },
  {
    kind: 'services',
    label: 'Servicios',
    singular: 'servicio',
    hasCode: true,
    codeLabel: 'Código',
    codeHint: 'MAYÚSCULAS y guiones bajos, p. ej. ASISTENCIA_SOCIAL',
  },
  {
    kind: 'motives',
    label: 'Motivos',
    singular: 'motivo',
    hasCode: true,
    codeLabel: 'Código',
    codeHint: 'MAYÚSCULAS y guiones bajos, p. ej. PERSONAL_EMOTIONAL',
  },
];

export const catalogService = {
  async list(kind: CatalogKind): Promise<CatalogEntry[]> {
    const response = await apiClient.get<{ entries: CatalogEntry[] }>(`/catalogs/${kind}`);
    return response.data.entries;
  },

  async create(kind: CatalogKind, input: CatalogInput): Promise<CatalogEntry> {
    const response = await apiClient.post<{ entry: CatalogEntry }>(`/catalogs/${kind}`, input);
    return response.data.entry;
  },

  async update(kind: CatalogKind, id: string, input: CatalogInput): Promise<CatalogEntry> {
    const response = await apiClient.put<{ entry: CatalogEntry }>(`/catalogs/${kind}/${id}`, input);
    return response.data.entry;
  },

  async remove(kind: CatalogKind, id: string): Promise<void> {
    await apiClient.delete(`/catalogs/${kind}/${id}`);
  },
};
