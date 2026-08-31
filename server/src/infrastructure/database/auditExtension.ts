import { PrismaClient } from '@prisma/client';
import { getRequestContext } from '../context/requestContext';
import { buildAuditEntry } from './auditEntry';

interface OperationParams {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

/**
 * Extensión de Prisma que audita globalmente las mutaciones sobre los modelos
 * críticos. Ejecuta la operación real, y luego —si corresponde— registra autor,
 * acción y entidad afectada tomando el usuario del AsyncLocalStorage.
 *
 * Recibe el cliente base (sin extender) para escribir la bitácora, de modo que
 * esa escritura no vuelva a pasar por el interceptor.
 */
export function auditExtension(base: PrismaClient) {
  return {
    name: 'audit-trail',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: OperationParams) {
          const result = await query(args);

          try {
            const ctx = getRequestContext();
            const entry = buildAuditEntry({
              model,
              operation,
              args,
              result,
              userId: ctx?.userId,
              ipAddress: ctx?.ipAddress,
            });
            if (entry) {
              await base.auditLog.create({ data: entry });
            }
          } catch (err) {
            // La auditoría nunca debe romper la operación de negocio.
            console.error('[audit] no se pudo registrar la bitácora:', err);
          }

          return result;
        },
      },
    },
  };
}
