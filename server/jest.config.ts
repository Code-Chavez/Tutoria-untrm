import type { Config } from 'jest';
import dotenv from 'dotenv';
import { effectiveDatabaseUrl, isTestDatabase, refusalMessage } from './tests/support/testDatabase';

dotenv.config();

// El comando habitual (`pnpm test`) corre solo las pruebas unitarias cuando la base configurada no es de pruebas: las de integración
// escriben datos y no deben tocar la base de desarrollo. Con REQUIRE_DB_TESTS=1 (la CI) se ejecutan siempre y, si la base no es de
// pruebas, fallan con un mensaje claro (ver tests/support/testDatabaseGuard.ts).
const integrationAllowed = isTestDatabase(effectiveDatabaseUrl()) || process.env.REQUIRE_DB_TESTS === '1';
if (!integrationAllowed) {
  console.warn(`\n[jest] Se omiten las pruebas de integración. ${refusalMessage(effectiveDatabaseUrl())}\n`);
}

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: integrationAllowed ? ['/node_modules/'] : ['/node_modules/', '/tests/integration/'],
  setupFilesAfterEnv: ['<rootDir>/tests/support/testDatabaseGuard.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
  },
};

export default config;
