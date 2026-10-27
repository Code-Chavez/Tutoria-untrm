import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { findUnfinishedRuns, installRowLedger, snapshotPreexisting, unfinishedRunsMessage } from './rowLedger';
import { connectedDatabaseName } from './connectedDatabase';
import { connectedRefusalMessage, effectiveDatabaseUrl, isTestDatabase } from './testDatabase';

// Corre UNA vez, antes de cualquier prueba, solo si las de integración pueden ejecutarse. Pregunta al servidor a qué base llega la
// conexión que usará la aplicación; si no es una base de pruebas, aborta toda la corrida sin haber ejecutado nada. Si no hay
// conexión no se puede modificar nada y las propias pruebas fallarán por eso. Y, ya en una base de pruebas, se niega a empezar si
// encuentra restos de una corrida anterior (ver findUnfinishedRuns).
export default async function globalSetup(): Promise<void> {
  dotenv.config();
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const integrationAllowed = isTestDatabase(effectiveDatabaseUrl()) || process.env.REQUIRE_DB_TESTS === '1';
  if (!integrationAllowed) return;

  const realName = await connectedDatabaseName(process.env.DATABASE_URL);
  if (realName !== null && !realName.endsWith('_test')) throw new Error(connectedRefusalMessage(realName));
  if (realName === null) return; // sin conexión no hay nada que registrar ni que modificar

  // Base de pruebas ya comprobada (solo a partir de aquí se lee o se escribe algo en ella).
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] });
  try {
    // Una corrida anterior que murió, o que terminó con residuos o cambios, deja su foto o filas sin borrar. Aceptar esa base daría por
    // «preexistente» lo que una prueba dejó mal: se detiene todo, sin tocar nada, con las instrucciones para recuperarla.
    const unfinished = await findUnfinishedRuns(prisma);
    if (unfinished.snapshots.length > 0 || unfinished.ledgerRows > 0) throw new Error(unfinishedRunsMessage(unfinished));

    // Se instala el registro de origen de las filas que cree cada archivo (ver rowLedger.ts).
    process.env.SIT_TEST_RUN_ID = randomBytes(4).toString('hex');
    await installRowLedger(prisma);
    // Foto de todo lo que ya existe: al terminar se comprueba que nada de eso se borró ni cambió (ver testDatabaseGlobalTeardown.ts).
    await snapshotPreexisting(prisma, process.env.SIT_TEST_RUN_ID);
  } finally {
    await prisma.$disconnect();
  }
}
