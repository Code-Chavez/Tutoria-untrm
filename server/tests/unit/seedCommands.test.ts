import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * Los comandos de siembra terminan con ERROR y muestran la causa cuando fallan. Antes `prisma/seed.ts` registraba el error y salía con
 * código 0, de modo que `test:db:prepare` imprimía «Base de pruebas lista.» y el arranque continuaba aunque la siembra hubiera fallado.
 * Se ejecutan como procesos reales contra una base que no responde (puerto 1), sin tocar ninguna base.
 */
jest.setTimeout(240_000);

const root = path.resolve(__dirname, '..', '..');
const UNREACHABLE = 'postgresql://u:p@127.0.0.1:1/sit_inalcanzable_test';

function run(args: string[], env: Record<string, string>) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 200_000 });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('comandos de siembra: un fallo no se oculta', () => {
  it('`pnpm run seed` termina con error y muestra la causa si no puede sembrar', () => {
    const result = run([path.join('node_modules', 'ts-node', 'dist', 'bin.js'), '-r', 'tsconfig-paths/register', 'prisma/seed.ts'], { DATABASE_URL: UNREACHABLE });

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('El seed falló');
    expect(result.output).not.toContain('Seed completed successfully');
  });

  it('`test:db:prepare` termina con error y muestra la causa si no puede preparar la base, y no dice que quedó lista', () => {
    const result = run([path.join('scripts', 'prepare-test-db.js')], { TEST_DATABASE_URL: UNREACHABLE });

    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/Can't reach database server|P1001/);
    expect(result.output).not.toContain('Base de pruebas lista');
  });

  it('`test:db:prepare` se niega, con el motivo, si la base no es de pruebas', () => {
    const result = run([path.join('scripts', 'prepare-test-db.js')], { TEST_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/sit_db' });

    expect(result.status).toBe(1);
    expect(result.output).toContain('termine en «_test»');
  });
});
