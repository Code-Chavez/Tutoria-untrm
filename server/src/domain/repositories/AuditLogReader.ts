import { AuditLog } from '../entities/AuditLog';

export interface AuditLogQuery {
  /** Inicio (inclusive) del rango de fechas. */
  from?: Date;
  /** Fin (inclusive) del rango de fechas. */
  to?: Date;
  /** Texto contenido en el nombre, apellido o correo de quien hizo la operación. */
  actor?: string;
  entity?: string;
  action?: string;
  /** Página 1-based. */
  page: number;
  pageSize: number;
}

/** Un registro de la bitácora con el nombre de su autor (la consulta no expone más datos de la cuenta). */
export interface AuditLogEntryView extends AuditLog {
  actorName: string;
  actorEmail: string;
}

export interface AuditLogPage {
  items: AuditLogEntryView[];
  total: number;
}

/** Consulta de la bitácora (UI-09): puerto de lectura, separado del de escritura. */
export interface AuditLogReader {
  query(query: AuditLogQuery): Promise<AuditLogPage>;
  /** Entidades y acciones que ya constan en la bitácora, para los filtros de la pantalla. */
  distinctOptions(): Promise<{ entities: string[]; actions: string[] }>;
}
