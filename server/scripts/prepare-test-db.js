#!/usr/bin/env node
/**
 * Deja lista la base EXCLUSIVA de pruebas de integración: aplica las migraciones y siembra las cuentas de demostración que usan las
 * pruebas de acceso. Solo actúa sobre TEST_DATABASE_URL y solo si su nombre termina en «_test»; nunca sobre la de desarrollo.
 *   TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test node scripts/prepare-test-db.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const url = process.env.TEST_DATABASE_URL;
const name = (() => {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
})();
if (!url || !name.endsWith('_test')) {
  console.error(`Defina TEST_DATABASE_URL con una base cuyo nombre termine en «_test» (hoy: «${name || 'sin definir'}»). No se hizo nada.`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };
const root = path.resolve(__dirname, '..');
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

async function main() {
  console.log(`Base de pruebas: ${name}`);
  // El motor de migraciones puede perder el diagnóstico de conexión en Windows. Comprobarla antes da una causa estable y
  // evita iniciar migraciones/seed si la base no responde. No se imprime el error libre, que podría incluir credenciales.
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$connect();
  } catch (error) {
    const code = typeof error?.errorCode === 'string' && /^P\d{4}$/.test(error.errorCode) ? error.errorCode : 'sin código';
    console.error(`No se pudo conectar con la base de pruebas (${code}). No se ejecutaron migraciones ni seed.`);
    process.exitCode = 1;
    return;
  } finally {
    await prisma.$disconnect();
  }
  run('npx', ['prisma', 'migrate', 'deploy']);
  run('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'prisma/seed.ts']);
  console.log('Base de pruebas lista.');
}

main().catch(() => {
  console.error('No se pudo preparar la base de pruebas.');
  process.exitCode = 1;
});
