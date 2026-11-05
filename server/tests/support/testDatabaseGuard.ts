import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { holdGlobalStateLock, lockModeFor } from './globalStateLock';
import { ORIGIN_PREFIX, leftovers, originName, sweepOrigin, withApplicationName } from './rowLedger';
import { effectiveDatabaseUrl, isTestDatabase, refusalMessage } from './testDatabase';

// Se ejecuta antes de cada archivo de pruebas (setupFilesAfterEnv) y ANTES de que el archivo cree su cliente de Prisma:
//  1. si hay TEST_DATABASE_URL, es la base que usará la aplicación (sobrescribe DATABASE_URL, incluido el del .env);
//  2. una prueba de integración que apunte a una base que no sea de pruebas falla de inmediato, sin llegar a conectarse.
dotenv.config();
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const testPath = (expect.getState().testPath ?? '').replace(/\\/g, '/');
if (testPath.includes('/tests/integration/') && !isTestDatabase(effectiveDatabaseUrl())) {
  throw new Error(refusalMessage(effectiveDatabaseUrl()));
}

// Cada archivo de integración se conecta con su propio origen y, al terminar (también si una prueba falló), borra lo que ESE archivo creó.
// Va después de la comprobación de arriba: aquí la base ya es de pruebas. Debe ejecutarse antes de que el archivo cargue la aplicación.
if (testPath.includes('/tests/integration/') && process.env.SIT_TEST_RUN_ID && process.env.DATABASE_URL) {
  const origin = originName(process.env.SIT_TEST_RUN_ID, process.pid, testPath);
  const plainUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = withApplicationName(plainUrl, origin);

  // Candado entre archivos en paralelo: compartido por todos; exclusivo para los que cambian configuración global (ver globalStateLock.ts).
  let releaseLock: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    releaseLock = await holdGlobalStateLock(plainUrl, lockModeFor(testPath));
  }, 30 * 60_000);

  afterAll(async () => {
    await releaseLock?.();
    const prisma = new PrismaClient({ datasourceUrl: plainUrl, log: [] });
    try {
      if ((await sweepOrigin(prisma, origin)) > 0) {
        console.warn(`[${ORIGIN_PREFIX}] ${origin}: filas que no se pudieron borrar (las referencia algo ajeno):`, await leftovers(prisma, origin));
      }
    } catch (error) {
      console.warn(`[${ORIGIN_PREFIX}] ${origin}: no se pudo limpiar el registro de filas:`, String(error));
    } finally {
      await prisma.$disconnect();
    }
  });
}
