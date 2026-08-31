/**
 * Modelos cuyas mutaciones (create/update/delete) se auditan automáticamente.
 * Extensible a medida que aparezcan entidades críticas (derivaciones, fichas…).
 */
export const CRITICAL_MODELS = new Set<string>(['User']);

const OPERATION_ACTION: Record<string, string> = {
  create: 'CREATE',
  update: 'UPDATE',
  delete: 'DELETE',
};

export interface AuditEntryInput {
  model?: string;
  operation: string;
  args: unknown;
  result: unknown;
  userId?: string;
  ipAddress?: string;
}

export interface AuditEntryData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  ipAddress: string | null;
}

function readId(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

function readWhereId(args: unknown): string | undefined {
  if (args && typeof args === 'object' && 'where' in args) {
    return readId((args as { where: unknown }).where);
  }
  return undefined;
}

function changedFields(args: unknown): string | null {
  if (args && typeof args === 'object' && 'data' in args) {
    const data = (args as { data: unknown }).data;
    if (data && typeof data === 'object') {
      const keys = Object.keys(data as Record<string, unknown>);
      return keys.length > 0 ? keys.join(', ') : null;
    }
  }
  return null;
}

/**
 * Construye el registro de auditoría para una operación de Prisma, o `null` si
 * no debe auditarse: modelo no crítico, operación no mutante, o sin usuario
 * autenticado (operaciones de sistema/seed no son atribuibles a nadie).
 */
export function buildAuditEntry(input: AuditEntryInput): AuditEntryData | null {
  const { model, operation, args, result, userId, ipAddress } = input;

  if (!model || !CRITICAL_MODELS.has(model)) return null;

  const action = OPERATION_ACTION[operation];
  if (!action) return null;

  if (!userId) return null;

  const entityId = readId(result) ?? readWhereId(args) ?? 'desconocido';
  const details = operation === 'update' ? changedFields(args) : null;

  return {
    userId,
    action,
    entity: model,
    entityId,
    details,
    ipAddress: ipAddress ?? null,
  };
}
