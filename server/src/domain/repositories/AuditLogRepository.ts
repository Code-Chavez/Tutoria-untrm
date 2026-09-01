import { AuditLog } from '../entities/AuditLog';

export interface AuditLogRepository {
  create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findAll(filters?: { userId?: string; entity?: string }): Promise<AuditLog[]>;
}
