import { execFileSync } from 'node:child_process';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { bootstrap, WeakAdminPasswordError } from '../../src/infrastructure/bootstrap/bootstrap';

/**
 * Despliegue sobre una base vacía (A11): migra una base nueva y ejecuta el bootstrap de producción.
 * Debe dejar los datos base y UN administrador con la contraseña dada, y ninguna cuenta ni dato de
 * demostración. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(240_000);

const DB_NAME = `sit_bootstrap_${process.pid}`;
const ADMIN = { email: 'Directora@UNTRM.edu.pe', password: 'Una-clave-larga-y-propia-2026' };

function urlFor(database: string) {
  const base = new URL(process.env.DATABASE_URL ?? 'postgresql://sit_user:sit_pass@localhost:5432/sit_db');
  base.pathname = `/${database}`;
  return base.toString();
}

describe('instalación nueva: bootstrap de producción (A11)', () => {
  let dbUp = false;
  let admin: PrismaClient;
  let fresh: PrismaClient;

  beforeAll(async () => {
    admin = new PrismaClient({ datasources: { db: { url: urlFor('postgres') } } });
    try {
      await admin.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite el bootstrap de producción.');
      return;
    }
    await admin.$executeRawUnsafe(`CREATE DATABASE "${DB_NAME}"`);
    execFileSync(process.execPath, [path.join('node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], {
      cwd: path.resolve(__dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: urlFor(DB_NAME) },
      stdio: 'pipe',
    });
    fresh = new PrismaClient({ datasources: { db: { url: urlFor(DB_NAME) } } });
  });

  afterAll(async () => {
    if (fresh) await fresh.$disconnect();
    if (dbUp) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    await admin.$disconnect();
  });

  it('una contraseña de ejemplo para el primer administrador se rechaza y no crea nada', async () => {
    if (!dbUp) return;
    await expect(bootstrap(fresh, { adminEmail: ADMIN.email, adminPassword: 'Admin2026!', bcryptRounds: 4 })).rejects.toBeInstanceOf(
      WeakAdminPasswordError,
    );
    expect(await fresh.user.count()).toBe(0);
  });

  it('sobre una base vacía crea los datos base y un solo administrador, sin cuentas ni datos de demostración', async () => {
    if (!dbUp) return;
    const result = await bootstrap(fresh, { adminEmail: ADMIN.email, adminPassword: ADMIN.password, bcryptRounds: 4 });
    expect(result.createdAdmin).toBe(true);

    expect(await fresh.user.count()).toBe(1);
    const user = await fresh.user.findFirstOrThrow({ include: { role: true } });
    expect(user.email).toBe('directora@untrm.edu.pe');
    expect(user.role.name).toBe('Administrador DBU');
    expect(await bcrypt.compare(ADMIN.password, user.passwordHash)).toBe(true);
    expect(await bcrypt.compare('Admin2026!', user.passwordHash)).toBe(false);

    // Ninguna cuenta ni dato de demostración.
    expect(await fresh.user.count({ where: { email: { in: ['rosa.mendoza@untrm.edu.pe', 'elena.ramirez@untrm.edu.pe', '7183255722@untrm.edu.pe', '20191234@untrm.edu.pe'] } } })).toBe(0);
    expect(await fresh.student.count()).toBe(0);
    expect(await fresh.school.count()).toBe(0);
    expect(await fresh.faculty.count()).toBe(0);
    expect(await fresh.academicPeriod.count()).toBe(0);
    expect(await fresh.session.count()).toBe(0);

    // Datos base presentes: los seis roles con sus permisos y los parámetros del sistema.
    expect(await fresh.role.count()).toBe(6);
    expect(await fresh.permission.count()).toBeGreaterThan(20);
    expect(await fresh.rolePermission.count()).toBeGreaterThan(40);
    expect(await fresh.systemParameter.count()).toBeGreaterThanOrEqual(6);
  });

  it('repetirlo no duplica ni cambia la contraseña de un administrador existente', async () => {
    if (!dbUp) return;
    const before = await fresh.user.findFirstOrThrow();
    const again = await bootstrap(fresh, { adminEmail: 'otro@untrm.edu.pe', adminPassword: 'Otra-clave-larga-2026', bcryptRounds: 4 });
    expect(again.createdAdmin).toBe(false);
    expect(await fresh.user.count()).toBe(1);
    expect((await fresh.user.findFirstOrThrow()).passwordHash).toBe(before.passwordHash);
  });
});
