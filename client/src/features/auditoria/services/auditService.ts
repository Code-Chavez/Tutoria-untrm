import { apiClient } from '@shared/services/apiClient';

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  ipAddress: string | null;
  actorName: string;
  actorEmail: string;
}

export interface AuditFilters {
  from?: string;
  to?: string;
  actor?: string;
  entity?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditOptions {
  entities: string[];
  actions: string[];
}

// Nombres legibles; lo que no figure se muestra tal cual consta.
export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  REFRESH_TOKEN_REUSE: 'Sesión cerrada por reutilización de token',
};

export const ENTITY_LABEL: Record<string, string> = {
  User: 'Usuario',
  Faculty: 'Facultad',
  School: 'Escuela profesional',
  AcademicPeriod: 'Periodo académico',
  CatalogItem: 'Elemento de catálogo',
};

export const actionLabel = (action: string) => ACTION_LABEL[action] ?? action;
export const entityLabel = (entity: string) => ENTITY_LABEL[entity] ?? entity;

const clean = (filters: AuditFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));

export const auditService = {
  async list(filters: AuditFilters): Promise<AuditPage> {
    const response = await apiClient.get<AuditPage>('/audit', { params: clean(filters) });
    return response.data;
  },

  async options(): Promise<AuditOptions> {
    const response = await apiClient.get<AuditOptions>('/audit/options');
    return response.data;
  },
};
