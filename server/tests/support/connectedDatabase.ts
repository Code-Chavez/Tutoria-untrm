import { PrismaClient } from '@prisma/client';

/**
 * Nombre de la base REAL a la que se conecta la aplicación, preguntado al servidor (`current_database()`), no deducido de una
 * variable: es lo que decide qué datos se modifican. Devuelve null si no se puede conectar (entonces tampoco se puede modificar nada).
 */
export async function connectedDatabaseName(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  const prisma = new PrismaClient({ datasourceUrl: url, log: [] });
  try {
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    return rows[0]?.name ?? null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}
