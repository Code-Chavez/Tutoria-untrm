import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../../prisma/seed';

/**
 * La seed de desarrollo solo CREA lo que falta (prisma/seed.ts). En una base temporal propia: se siembra, se modifican a mano coordinaciones,
 * sedes, escuelas de docentes, vínculos de estudiantes y matrículas, se agrega un estudiante propio y se siembra OTRA VEZ. Nada de eso debe
 * cambiar, ni debe aparecer ni desaparecer ninguna fila. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(240_000);

const DB_NAME = `sit_seed_${process.pid}`;
const ROUNDS = 4; // solo acelera el hash de las cuentas de demostración en la prueba

function urlFor(database: string) {
  const base = new URL(process.env.DATABASE_URL ?? 'postgresql://sit_user:sit_pass@localhost:5432/sit_db');
  base.pathname = `/${database}`;
  return base.toString();
}

/** Todas las filas de todas las tablas (con sus valores completos), para comparar antes y después. */
async function snapshotAll(prisma: PrismaClient): Promise<Record<string, string[]>> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations' ORDER BY 1`;
  const snapshot: Record<string, string[]> = {};
  for (const { table_name } of tables) {
    const rows = await prisma.$queryRawUnsafe<Array<{ row: unknown }>>(`SELECT to_jsonb(t) AS row FROM "${table_name}" t`);
    snapshot[table_name] = rows.map((r) => JSON.stringify(r.row)).sort();
  }
  return snapshot;
}

describe('seed de desarrollo: solo crea lo que falta', () => {
  let dbUp = false;
  let admin: PrismaClient;
  let db: PrismaClient;

  beforeAll(async () => {
    admin = new PrismaClient({ datasources: { db: { url: urlFor('postgres') } } });
    try {
      await admin.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de la seed.');
      return;
    }
    await admin.$executeRawUnsafe(`CREATE DATABASE "${DB_NAME}"`);
    execFileSync(process.execPath, [path.join('node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], {
      cwd: path.resolve(__dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: urlFor(DB_NAME) },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: urlFor(DB_NAME) } } });
  });

  afterAll(async () => {
    if (db) await db.$disconnect();
    if (dbUp) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    await admin.$disconnect();
  });

  it('en una base vacía crea las cuentas, las escuelas con su coordinación y sede, los vínculos y las matrículas de sus estudiantes', async () => {
    if (!dbUp) return;
    const summary = await seedDemo(db, { quiet: true, bcryptRounds: ROUNDS });

    expect(summary).toEqual({ users: 12, students: 12, enrollments: 11 }); // la estudiante inactiva no se matricula
    const sistemas = await db.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' }, include: { coordinator: true, campus: true } });
    expect(sistemas.coordinator?.email).toBe('rosa.mendoza@untrm.edu.pe');
    expect(sistemas.campus?.name).toBe('Sede Central');
    expect((await db.school.findFirstOrThrow({ where: { name: 'Administración de Empresas' } })).coordinatorId).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).schoolId).toBe(sistemas.id);
    expect((await db.user.findUniqueOrThrow({ where: { email: 'decano.fisme@untrm.edu.pe' } })).facultyId).not.toBeNull();
    expect((await db.student.findUniqueOrThrow({ where: { studentCode: '20191234' } })).userId).not.toBeNull();
    expect(await db.periodEnrollment.count()).toBe(11);
  });

  it('sembrar otra vez conserva coordinaciones, sedes, escuelas de docentes, vínculos y matrículas modificados, sin crear ni borrar nada', async () => {
    if (!dbUp) return;
    const userId = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id;
    const school = (name: string) => db.school.findFirstOrThrow({ where: { name } });
    const campus = (name: string) => db.campus.findUniqueOrThrow({ where: { name } });
    const [sistemas, mecanica, empresas] = await Promise.all([school('Ingeniería de Sistemas'), school('Ingeniería Mecánica Eléctrica'), school('Administración de Empresas')]);
    const [bagua, utcubamba] = await Promise.all([campus('Sede Bagua'), campus('Sede Utcubamba')]);

    // Cambios hechos a mano en un entorno en uso
    await db.school.update({ where: { id: sistemas.id }, data: { coordinatorId: await userId('carlos.vega@untrm.edu.pe'), campusId: bagua.id } });
    await db.school.update({ where: { id: mecanica.id }, data: { coordinatorId: null, campusId: utcubamba.id } });
    await db.school.update({ where: { id: empresas.id }, data: { coordinatorId: await userId('rosa.mendoza@untrm.edu.pe'), campusId: null } });
    await db.user.update({ where: { email: 'elena.ramirez@untrm.edu.pe' }, data: { schoolId: mecanica.id } });
    await db.user.update({ where: { email: 'jorge.salazar@untrm.edu.pe' }, data: { schoolId: null } });
    await db.user.update({ where: { email: 'decano.fisme@untrm.edu.pe' }, data: { facultyId: null } });
    await db.student.update({ where: { studentCode: '20191234' }, data: { userId: null } }); // Ana sin cuenta de portal
    const brayan = await db.student.findUniqueOrThrow({ where: { studentCode: '20221011' } });
    await db.periodEnrollment.deleteMany({ where: { studentId: brayan.id } }); // desmatriculado a propósito
    const extra = await db.student.create({ data: { studentCode: 'PROPIO-001', firstName: 'Estudiante', lastName: 'Propio', cycle: 4, schoolId: sistemas.id } }); // activo, sin matrícula
    const before = await snapshotAll(db);

    const summary = await seedDemo(db, { quiet: true, bcryptRounds: ROUNDS });

    expect(summary).toEqual({ users: 0, students: 0, enrollments: 0 });
    // Lo modificado se conserva, dato por dato
    const sistemasNow = await school('Ingeniería de Sistemas');
    expect(sistemasNow.coordinatorId).toBe(await userId('carlos.vega@untrm.edu.pe'));
    expect(sistemasNow.campusId).toBe(bagua.id);
    expect(await school('Ingeniería Mecánica Eléctrica')).toMatchObject({ coordinatorId: null, campusId: utcubamba.id });
    expect(await school('Administración de Empresas')).toMatchObject({ coordinatorId: await userId('rosa.mendoza@untrm.edu.pe'), campusId: null });
    expect((await db.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).schoolId).toBe(mecanica.id);
    expect((await db.user.findUniqueOrThrow({ where: { email: 'jorge.salazar@untrm.edu.pe' } })).schoolId).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { email: 'decano.fisme@untrm.edu.pe' } })).facultyId).toBeNull();
    expect((await db.student.findUniqueOrThrow({ where: { studentCode: '20191234' } })).userId).toBeNull();
    expect(await db.periodEnrollment.count({ where: { studentId: brayan.id } })).toBe(0); // no se re-matricula
    expect(await db.periodEnrollment.count({ where: { studentId: extra.id } })).toBe(0); // no se matricula a un estudiante que no es de la seed
    // Y nada más cambió: ninguna fila nueva, ninguna borrada, ningún valor distinto
    expect(await snapshotAll(db)).toEqual(before);
  });
});
