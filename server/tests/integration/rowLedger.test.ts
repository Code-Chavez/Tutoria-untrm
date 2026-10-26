import { PrismaClient } from '@prisma/client';
import { holdGlobalStateLock } from '../support/globalStateLock';
import { ORIGIN_PREFIX, describeDifferences, dropSnapshot, findUnfinishedRuns, leftovers, preexistingDifferences, snapshotPreexisting, sweepOrigin, withApplicationName } from '../support/rowLedger';

/**
 * El registro de origen de las filas (tests/support/rowLedger.ts) sobre la base de pruebas real: borra lo que creó una conexión de
 * prueba, deja intacto lo que creó cualquier otra, y no fuerza el borrado de lo que algo ajeno todavía referencia.
 */
jest.setTimeout(60_000);
const stamp = Date.now();
const origin = `${ORIGIN_PREFIX}ledger-${stamp}:test`;

describe('registro de origen de filas de las pruebas', () => {
  const base = process.env.DATABASE_URL as string;
  const mine = new PrismaClient({ datasourceUrl: withApplicationName(base, origin), log: [] });
  const outsider = new PrismaClient({ datasourceUrl: withApplicationName(base, `otra-herramienta-${stamp}`), log: [] });
  const admin = new PrismaClient({ datasourceUrl: base, log: [] });
  const campusIds: string[] = [];
  const schoolIds: string[] = [];

  afterAll(async () => {
    await admin.school.deleteMany({ where: { id: { in: schoolIds } } });
    await admin.campus.deleteMany({ where: { id: { in: campusIds } } });
    await admin.$executeRaw`DELETE FROM test_row_origin WHERE origin = ${origin}`;
    await Promise.all([mine.$disconnect(), outsider.$disconnect(), admin.$disconnect()]);
  });

  it('borra lo que creó la conexión de prueba y conserva lo que creó cualquier otra', async () => {
    const own = await mine.campus.create({ data: { name: `Sede del registro (propia) ${stamp}` } });
    const foreign = await outsider.campus.create({ data: { name: `Sede del registro (ajena) ${stamp}` } });
    campusIds.push(own.id, foreign.id);

    const remaining = await sweepOrigin(admin, origin);

    expect(remaining).toBe(0);
    expect(await admin.campus.findUnique({ where: { id: own.id } })).toBeNull();
    expect(await admin.campus.findUnique({ where: { id: foreign.id } })).not.toBeNull();
  });

  it('lo que otra fila ajena todavía referencia no se borra a la fuerza: se deja y se informa', async () => {
    const own = await mine.campus.create({ data: { name: `Sede del registro (referenciada) ${stamp}` } });
    campusIds.push(own.id);
    const faculty = await admin.faculty.findFirstOrThrow();
    const school = await outsider.school.create({ data: { name: `Escuela ajena del registro ${stamp}`, facultyId: faculty.id, campusId: own.id } });
    schoolIds.push(school.id);

    const remaining = await sweepOrigin(admin, origin);

    expect(remaining).toBe(1);
    expect(await leftovers(admin, origin)).toEqual([{ tbl: 'campuses', n: 1 }]);
    expect(await admin.campus.findUnique({ where: { id: own.id } })).not.toBeNull();
  });

  it('la foto de filas preexistentes detecta una fila borrada o con un valor cambiado, y no se queja de las nuevas', async () => {
    const kept = await outsider.campus.create({ data: { name: `Sede preexistente A ${stamp}` } });
    const gone = await outsider.campus.create({ data: { name: `Sede preexistente B ${stamp}` } });
    campusIds.push(kept.id, gone.id);
    const run = `ledger-foto-${stamp}`;
    await snapshotPreexisting(admin, run);

    const added = await outsider.campus.create({ data: { name: `Sede nueva ${stamp}` } });
    campusIds.push(added.id);
    await outsider.campus.update({ where: { id: kept.id }, data: { name: `Sede preexistente A (cambiada) ${stamp}` } });
    await outsider.campus.delete({ where: { id: gone.id } });
    // Otras suites pueden correr a la vez y tocar sus propias filas: aquí solo se miran estas tres.
    const mine = (await preexistingDifferences(admin, run)).filter((d) => [kept.id, gone.id, added.id].includes(d.rowId));
    await dropSnapshot(admin, run);

    expect(mine.map((d) => `${d.rowId === kept.id ? 'cambiada' : 'borrada'}:${d.kind}`).sort()).toEqual(['borrada:BORRADA', 'cambiada:MODIFICADA']);
    expect(describeDifferences(mine)).toContain('MODIFICADA (name)');
  });

  it('el candado exclusivo espera a que terminen los compartidos y los que llegan después esperan al exclusivo', async () => {
    const key = String(7183255800 + (stamp % 1000));
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const shared1 = await holdGlobalStateLock(base, 'shared', key);
    const shared2 = await holdGlobalStateLock(base, 'shared', key);
    let exclusiveHeld = false;
    const exclusive = holdGlobalStateLock(base, 'exclusive', key).then((release) => {
      exclusiveHeld = true;
      return release;
    });

    await pause(1500);
    expect(exclusiveHeld).toBe(false); // hay compartidos vigentes
    await shared1();
    await pause(700);
    expect(exclusiveHeld).toBe(false); // todavía queda uno
    await shared2();
    const releaseExclusive = await exclusive;
    expect(exclusiveHeld).toBe(true);

    let sharedHeld = false;
    const late = holdGlobalStateLock(base, 'shared', key).then((release) => {
      sharedHeld = true;
      return release;
    });
    await pause(1500);
    expect(sharedHeld).toBe(false); // el exclusivo corre solo
    await releaseExclusive();
    await (await late)();
  });

  it('encuentra los restos de una corrida interrumpida (su foto y filas sin borrar) y deja de verlos cuando se recupera', async () => {
    const run = `interrumpida-${stamp}`;
    const fakeOrigin = `${ORIGIN_PREFIX}${run}:test`;
    // Lo que deja una corrida que murió: la foto de sus filas preexistentes y una fila creada que nadie borró.
    await admin.$executeRaw`INSERT INTO test_preexisting (run, tbl, row_id, row_json) VALUES (${run}, 'campuses', ${`x-${stamp}`}, '{}'::jsonb)`;
    await admin.$executeRaw`INSERT INTO test_row_origin (tbl, row_id, origin) VALUES ('campuses', ${`y-${stamp}`}, ${fakeOrigin})`;
    try {
      // Otras suites pueden tener ahora sus propias filas en el registro: solo se mira la corrida ficticia.
      const found = await findUnfinishedRuns(admin);
      expect(found.snapshots).toContainEqual({ run, rows: 1 });
      expect(found.ledgerRows).toBeGreaterThanOrEqual(1);
    } finally {
      await admin.$executeRaw`DELETE FROM test_preexisting WHERE run = ${run}`;
      await admin.$executeRaw`DELETE FROM test_row_origin WHERE origin = ${fakeOrigin}`;
    }
    expect((await findUnfinishedRuns(admin)).snapshots.some((s) => s.run === run)).toBe(false);
  });
});
