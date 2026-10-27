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
  PASSWORD_RESET_REQUEST: 'Solicitud de recuperación de contraseña',
  PASSWORD_RESET: 'Contraseña restablecida',
  SIGNED_DOCUMENT_ATTACHED: 'Documento firmado adjuntado',
  READ: 'Consulta de información sensible',
  DOWNLOAD: 'Descarga de documento',
  CHANGE_PASSWORD: 'Cambio de contraseña',
  INVITATION_ISSUED: 'Invitación de acceso emitida',
  ASSIGN_ROLE: 'Cambio de rol',
  ROLE_CREATED: 'Rol creado',
  PERIOD_CLOSED: 'Periodo cerrado',
  PERIOD_REOPENED: 'Periodo reabierto',
  UPDATE_PARAMETER: 'Parámetro del sistema modificado',
  UPDATE_BRANDING: 'Identidad visual modificada',
  UPDATE_BRANDING_LOGO: 'Logo institucional cambiado',
  REMOVE_BRANDING_LOGO: 'Logo institucional quitado',
  RESET_BRANDING: 'Identidad visual restablecida',
  CAMPUS_CREATED: 'Sede creada',
  CAMPUS_UPDATED: 'Sede modificada',
  SCHOOL_CAMPUS_SET: 'Sede de la escuela definida',
  SCHOOL_REQUEST_EMAIL_SET: 'Correo de pedido de listas configurado',
  DATA_REQUEST_SENT: 'Lista pedida a la escuela',
  CYCLE_TUTOR_SET: 'Tutor del ciclo asignado',
  CYCLE_TUTOR_REMOVED: 'Tutor del ciclo quitado',
  CYCLE_TUTOR_ACCEPTANCE_REQUESTED: 'Aceptación del tutor solicitada',
  CYCLE_TUTOR_ACCEPTED: 'El tutor aceptó su ciclo',
  CYCLE_TUTOR_DECLINED: 'El tutor rechazó su ciclo',
  TUTORING_REQUEST_STATUS: 'Estado de una solicitud de tutoría cambiado',
  TUTORING_REQUEST_SESSION: 'Solicitud atendida con una sesión',
  TUTORING_REQUEST_REFERRAL: 'Solicitud atendida con una derivación',
  ADMONITION_ISSUED: 'Amonestación registrada',
};

export const ENTITY_LABEL: Record<string, string> = {
  User: 'Usuario',
  Role: 'Rol',
  Faculty: 'Facultad',
  School: 'Escuela profesional',
  AcademicPeriod: 'Periodo académico',
  CatalogItem: 'Elemento de catálogo',
  StudentReferral: 'Derivación',
  Student: 'Estudiante',
  StudentRecord: 'Expediente del estudiante',
  Interview: 'Entrevistas del estudiante',
  FollowUp: 'Seguimientos del estudiante',
  SupportContact: 'Red de apoyo del estudiante',
  Referral: 'Derivación',
  SignedDocument: 'Documento firmado',
  SessionEvidence: 'Evidencia de sesión',
  AttendanceSheet: 'Hoja de asistencia',
  Admonition: 'Amonestación',
  BrandingSetting: 'Identidad visual',
  Campus: 'Sede',
  CycleTutorAssignment: 'Tutor por ciclo',
  SystemParameter: 'Parámetro del sistema',
  TutoringRequest: 'Solicitud de tutoría',
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
