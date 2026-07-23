export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
}
