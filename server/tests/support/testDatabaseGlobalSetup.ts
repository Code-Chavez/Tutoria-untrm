import dotenv from 'dotenv';
import { connectedDatabaseName, connectedRefusalMessage, effectiveDatabaseUrl, isTestDatabase } from './testDatabase';

// Corre UNA vez, antes de cualquier prueba, solo si las de integración pueden ejecutarse. Pregunta al servidor a qué base llega la
// conexión que usará la aplicación; si no es una base de pruebas, aborta toda la corrida sin haber ejecutado nada. Si no hay
// conexión no se puede modificar nada y las propias pruebas fallarán por eso.
export default async function globalSetup(): Promise<void> {
  dotenv.config();
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const integrationAllowed = isTestDatabase(effectiveDatabaseUrl()) || process.env.REQUIRE_DB_TESTS === '1';
  if (!integrationAllowed) return;

  const realName = await connectedDatabaseName(process.env.DATABASE_URL);
  if (realName !== null && !realName.endsWith('_test')) throw new Error(connectedRefusalMessage(realName));
}
