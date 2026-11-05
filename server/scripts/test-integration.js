#!/usr/bin/env node
/**
 * Corre las pruebas de integración (sin paralelismo: comparten la base) contra la base EXCLUSIVA de pruebas. Exige TEST_DATABASE_URL
 * con una base «…_test»; si no, se niega y no toca nada. Argumentos extra se pasan a jest (p. ej. un archivo).
 *   TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test node scripts/test-integration.js [archivo]
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const url = process.env.TEST_DATABASE_URL;
const name = (() => {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
})();
if (!url || !name.endsWith('_test')) {
  console.error(`Defina TEST_DATABASE_URL con una base cuyo nombre termine en «_test» (hoy: «${name || 'sin definir'}»). No se ejecutó nada.`);
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const env = { ...process.env, DATABASE_URL: url, REQUIRE_DB_TESTS: '1' };
const extra = process.argv.slice(2);
const result = spawnSync('npx', ['jest', '--runInBand', ...(extra.length > 0 ? extra : ['tests/integration'])], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
