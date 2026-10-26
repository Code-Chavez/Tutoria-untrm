import { PrismaClient } from '@prisma/client';

/**
 * Candado entre archivos de pruebas de integración que corren en paralelo, sobre la base de pruebas.
 *
 * Todos los archivos toman el candado COMPARTIDO mientras duran. Los que cambian configuración GLOBAL del sistema (hoy: los parámetros de
 * seguridad de acceso, que leen todos los inicios de sesión) toman el EXCLUSIVO: esperan a que terminen los demás, corren solos y los demás
 * no empiezan hasta que terminan. Así ninguna otra suite ve el valor temporal. Es un candado de PostgreSQL (`pg_advisory_xact_lock`) que se
 * mantiene dentro de una transacción abierta: si el proceso muere, la conexión se cierra y el candado se libera solo.
 */
const LOCK_KEY = '7183255723';

/**
 * Archivos que cambian o recorren estado GLOBAL y por tanto no pueden correr a la vez que ningún otro:
 *  - securityParameters: cambia los parámetros de seguridad que lee cada inicio de sesión de todas las suites;
 *  - periodClosure: el cierre de un periodo copia la matrícula de TODOS los estudiantes; si otra suite borra uno en ese momento, la copia
 *    falla por clave foránea (se vio como un 500 intermitente al correr en paralelo).
 */
export const GLOBAL_STATE_SUITES = ['securityParameters', 'periodClosure'];

export type LockMode = 'shared' | 'exclusive';

export function lockModeFor(testFile: string): LockMode {
  const name = testFile.replace(/\\/g, '/').split('/').pop()?.replace(/\.test\.ts$/, '') ?? '';
  return GLOBAL_STATE_SUITES.includes(name) ? 'exclusive' : 'shared';
}

/** Espera el candado y lo mantiene hasta llamar a la función devuelta. */
export async function holdGlobalStateLock(databaseUrl: string, mode: LockMode, key: string = LOCK_KEY): Promise<() => Promise<void>> {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl, log: [] });
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let acquired: () => void = () => undefined;
  const gotLock = new Promise<void>((resolve) => {
    acquired = resolve;
  });
  const fn = mode === 'exclusive' ? 'pg_advisory_xact_lock' : 'pg_advisory_xact_lock_shared';
  const transaction = prisma.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(`SELECT ${fn}(${key})::text`);
      acquired();
      await released;
    },
    { maxWait: 120_000, timeout: 30 * 60_000 },
  );
  // Si la transacción falla antes de obtener el candado, se propaga el error en vez de esperar para siempre.
  await Promise.race([gotLock, transaction.then(() => Promise.reject(new Error('No se obtuvo el candado de las pruebas')))]);
  return async () => {
    release();
    await transaction.catch(() => undefined);
    await prisma.$disconnect();
  };
}
