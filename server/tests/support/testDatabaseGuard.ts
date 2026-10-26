import dotenv from 'dotenv';
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
