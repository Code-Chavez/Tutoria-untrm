import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '@infrastructure/database/prisma';

export type AccessKind = 'READ' | 'DOWNLOAD';

/** Texto que queda en la bitácora: solo el resultado, nunca el contenido consultado. */
export function accessDetails(kind: AccessKind, statusCode: number): string {
  const what = kind === 'READ' ? 'Consulta' : 'Descarga';
  return statusCode < 400 ? `${what} concedida` : `${what} denegada o sin resultado (HTTP ${statusCode})`;
}

/**
 * Registra en la bitácora quién consultó o descargó información sensible (fichas, expedientes, derivaciones, documentos),
 * sobre qué entidad y desde qué IP (RNF-COMP-01, Ley N.° 29733). Se coloca después de `authenticate` y antes de `authorize`
 * para que también queden los intentos rechazados. No guarda el contenido: solo actor, entidad, identificador y resultado.
 *
 * Política: es de mejor esfuerzo. Si la bitácora no se puede escribir, el error se registra en consola y la respuesta
 * no se altera (la consulta ya se atendió); un fallo persistente debe vigilarse en la operación.
 */
export function auditAccess(entity: string, kind: AccessKind, idOf: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const userId = req.auth?.sub;
      const entityId = idOf(req);
      if (!userId || !entityId) return;
      prisma.auditLog
        .create({ data: { userId, action: kind, entity, entityId, details: accessDetails(kind, res.statusCode), ipAddress: req.ip ?? null } })
        .catch((error: unknown) => console.error('[audit] no se pudo registrar el acceso:', error));
    });
    next();
  };
}

export const byParam = (name: string) => (req: Request) => {
  const value = req.params[name];
  return typeof value === 'string' ? value : undefined;
};
