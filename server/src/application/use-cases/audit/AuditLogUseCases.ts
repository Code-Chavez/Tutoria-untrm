import { AuditLogPage, AuditLogReader } from '@domain/repositories/AuditLogReader';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';

export class AuditLogForbiddenError extends Error {
  constructor() {
    super('Solo la DBU puede consultar la bitácora de auditoría');
    this.name = 'AuditLogForbiddenError';
  }
}

export const AUDIT_MAX_PAGE_SIZE = 100;

export interface AuditLogFilters {
  /** Fecha (AAAA-MM-DD) desde la cual se listan registros, inclusive. */
  from?: string;
  /** Fecha (AAAA-MM-DD) hasta la cual se listan registros, inclusive el día completo. */
  to?: string;
  actor?: string;
  entity?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogResult extends AuditLogPage {
  page: number;
  pageSize: number;
}

// Defensa en profundidad: además del permiso audit:read de la ruta, el caso de uso exige el rol de la DBU.
async function assertDbu(users: UserRepository, roles: RoleRepository, requesterId: string) {
  const user = await users.findById(requesterId);
  const role = user && user.isActive !== false ? await roles.findById(user.roleId) : null;
  if (role?.name !== 'Administrador DBU') throw new AuditLogForbiddenError();
}

const startOfDay = (date: string) => new Date(`${date}T00:00:00.000-05:00`);
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999-05:00`);

/** Bitácora de auditoría paginada y filtrable por fecha, autor, entidad y acción (UI-09). */
export class ListAuditLogUseCase {
  constructor(
    private readonly reader: AuditLogReader,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(requesterId: string, filters: AuditLogFilters = {}): Promise<AuditLogResult> {
    await assertDbu(this.users, this.roles, requesterId);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(AUDIT_MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? 25));
    const result = await this.reader.query({
      from: filters.from ? startOfDay(filters.from) : undefined,
      to: filters.to ? endOfDay(filters.to) : undefined,
      actor: filters.actor,
      entity: filters.entity,
      action: filters.action,
      page,
      pageSize,
    });
    return { ...result, page, pageSize };
  }
}

/** Valores que ya constan en la bitácora, para poblar los filtros. */
export class GetAuditLogOptionsUseCase {
  constructor(
    private readonly reader: AuditLogReader,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(requesterId: string): Promise<{ entities: string[]; actions: string[] }> {
    await assertDbu(this.users, this.roles, requesterId);
    return this.reader.distinctOptions();
  }
}
