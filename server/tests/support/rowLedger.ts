import { PrismaClient } from '@prisma/client';

/**
 * Registro de origen de las filas que crea una corrida de pruebas de integración (solo en la base de pruebas).
 *
 * Cada archivo de pruebas se conecta con un `application_name` propio («sit-jest:<corrida>:<proceso>:<archivo>»). Un disparador de la base
 * anota en `test_row_origin` cada fila que se inserta desde una conexión así. Al terminar el archivo (aunque una prueba falle) se borra
 * lo que ESE archivo creó, y solo eso, identificado por su origen y no por una hora ni por una cuenta compartida: es seguro aunque otra suite
 * corra a la vez, y los registros preexistentes no se tocan porque nunca estuvieron en el registro.
 */
export const ORIGIN_PREFIX = 'sit-jest:';

/** `application_name` de PostgreSQL admite hasta 63 caracteres. */
export function originName(runId: string, pid: number, testFile: string): string {
  const file = testFile.replace(/\\/g, '/').split('/').pop()?.replace(/\.test\.ts$/, '') ?? 'x';
  return `${ORIGIN_PREFIX}${runId}:${pid}:${file}`.slice(0, 63);
}

/** La misma URL con otro `application_name` (el nombre de la base y las demás opciones no cambian). */
export function withApplicationName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('application_name', name);
  return parsed.toString();
}

const INSTALL_SQL = `
DO $install$
DECLARE t record;
BEGIN
  PERFORM pg_advisory_xact_lock(7183255722);
  CREATE TABLE IF NOT EXISTS test_row_origin (
    seq bigserial PRIMARY KEY,
    tbl text NOT NULL,
    row_id text NOT NULL,
    origin text NOT NULL,
    UNIQUE (tbl, row_id)
  );
  CREATE OR REPLACE FUNCTION test_track_row() RETURNS trigger LANGUAGE plpgsql AS $fn$
  BEGIN
    IF current_setting('application_name', true) LIKE '${ORIGIN_PREFIX}%' THEN
      INSERT INTO test_row_origin (tbl, row_id, origin) VALUES (TG_TABLE_NAME, NEW.id::text, current_setting('application_name'))
      ON CONFLICT (tbl, row_id) DO NOTHING;
    END IF;
    RETURN NEW;
  END $fn$;
  -- ¿Alguna fila que NO sea de ese origen referencia a esta fila (cualquier clave foránea, sea RESTRICT, CASCADE o SET NULL)? Si es así no se
  -- borra: borrarla arrastraría o modificaría datos ajenos.
  CREATE OR REPLACE FUNCTION test_has_foreign_refs(p_tbl text, p_id text, pattern text) RETURNS boolean LANGUAGE plpgsql AS $fn$
  DECLARE c record; found boolean;
  BEGIN
    FOR c IN
      SELECT cc.relname AS child, ca.attname AS child_col, pa.attname AS parent_col
      FROM pg_constraint k
      JOIN pg_class cc ON cc.oid = k.conrelid
      JOIN pg_class pc ON pc.oid = k.confrelid
      JOIN pg_attribute ca ON ca.attrelid = k.conrelid AND ca.attnum = k.conkey[1]
      JOIN pg_attribute pa ON pa.attrelid = k.confrelid AND pa.attnum = k.confkey[1]
      WHERE k.contype = 'f' AND pc.relname = p_tbl AND pc.relnamespace = 'public'::regnamespace
    LOOP
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I ch WHERE ch.%I IN (SELECT %I FROM public.%I WHERE id = %L) ' ||
        'AND NOT EXISTS (SELECT 1 FROM test_row_origin o WHERE o.tbl = %L AND o.row_id = to_jsonb(ch)->>''id'' AND o.origin LIKE %L))',
        c.child, c.child_col, c.parent_col, p_tbl, p_id, c.child, pattern) INTO found;
      IF found THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  END $fn$;
  -- Borra, de la más reciente a la más antigua, las filas anotadas con ese origen. Una fila que otra fila ajena todavía referencia
  -- (clave foránea) se deja y se informa: nunca se borra a la fuerza ni en cascada algo que no es de la corrida.
  CREATE OR REPLACE FUNCTION test_sweep_origin(pattern text) RETURNS integer LANGUAGE plpgsql AS $fn$
  DECLARE r record; progress boolean; remaining integer;
  BEGIN
    LOOP
      progress := false;
      FOR r IN SELECT seq, tbl, row_id FROM test_row_origin WHERE origin LIKE pattern ORDER BY seq DESC LOOP
        CONTINUE WHEN test_has_foreign_refs(r.tbl, r.row_id, pattern);
        BEGIN
          EXECUTE format('DELETE FROM %I WHERE id = %L', r.tbl, r.row_id);
          DELETE FROM test_row_origin WHERE seq = r.seq;
          progress := true;
        EXCEPTION WHEN foreign_key_violation THEN
          NULL;
        END;
      END LOOP;
      EXIT WHEN NOT progress;
    END LOOP;
    SELECT count(*) INTO remaining FROM test_row_origin WHERE origin LIKE pattern;
    RETURN remaining;
  END $fn$;
  -- Foto de TODAS las filas que ya existían al empezar la corrida (valores completos), para comprobar al terminar que ninguna se borró ni
  -- cambió. Un contenedor de pruebas nuevo tiene solo la seed; uno reutilizado, además lo que dejaron otras corridas: eso también cuenta
  -- como «preexistente» y debe quedar igual.
  CREATE TABLE IF NOT EXISTS test_preexisting (
    run text NOT NULL, tbl text NOT NULL, row_id text NOT NULL, row_json jsonb NOT NULL,
    PRIMARY KEY (run, tbl, row_id)
  );
  CREATE OR REPLACE FUNCTION test_snapshot_rows(p_run text) RETURNS integer LANGUAGE plpgsql AS $fn$
  DECLARE r record; total integer := 0; n integer;
  BEGIN
    FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('test_row_origin', 'test_preexisting', '_prisma_migrations') LOOP
      EXECUTE format('INSERT INTO test_preexisting SELECT %L, %L, coalesce(to_jsonb(t)->>''id'', md5(t::text)), to_jsonb(t) FROM public.%I t', p_run, r.table_name, r.table_name);
      GET DIAGNOSTICS n = ROW_COUNT;
      total := total + n;
    END LOOP;
    RETURN total;
  END $fn$;
  -- Filas de la foto que ya no están (BORRADA) o cambiaron de valor (MODIFICADA, con el antes y el después).
  CREATE OR REPLACE FUNCTION test_diff_rows(p_run text) RETURNS TABLE (tbl text, row_id text, kind text, before jsonb, after jsonb) LANGUAGE plpgsql AS $fn$
  DECLARE r record;
  BEGIN
    FOR r IN SELECT DISTINCT p.tbl AS name FROM test_preexisting p WHERE p.run = p_run LOOP
      RETURN QUERY EXECUTE format(
        'SELECT p.tbl, p.row_id, CASE WHEN t.row_json IS NULL THEN ''BORRADA'' ELSE ''MODIFICADA'' END, p.row_json, t.row_json ' ||
        'FROM test_preexisting p LEFT JOIN (SELECT coalesce(to_jsonb(x)->>''id'', md5(x::text)) AS row_id, to_jsonb(x) AS row_json FROM public.%I x) t ON t.row_id = p.row_id ' ||
        'WHERE p.run = %L AND p.tbl = %L AND (t.row_json IS NULL OR t.row_json <> p.row_json)', r.name, p_run, r.name);
    END LOOP;
  END $fn$;
  FOR t IN SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'id' AND c.table_name NOT IN ('test_row_origin', '_prisma_migrations') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS test_track_row ON %I', t.table_name);
    EXECUTE format('CREATE TRIGGER test_track_row AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION test_track_row()', t.table_name);
  END LOOP;
END $install$;
`.replace('FOR t IN', 'FOR t IN').replace('BEGIN\n  PERFORM', 'BEGIN\n  PERFORM');

/** Crea (una vez por corrida) el registro, sus disparadores y la función de limpieza. SOLO en una base de pruebas ya comprobada. */
export async function installRowLedger(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(INSTALL_SQL);
}

/** Borra lo creado por los orígenes que coinciden con el patrón. Devuelve cuántas filas no se pudieron borrar. */
export async function sweepOrigin(prisma: PrismaClient, pattern: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ remaining: number }>>`SELECT test_sweep_origin(${pattern}) AS remaining`;
  return Number(rows[0]?.remaining ?? 0);
}

/** Qué quedó sin borrar para ese patrón, por tabla (para avisar con claridad). */
export async function leftovers(prisma: PrismaClient, pattern: string): Promise<Array<{ tbl: string; n: number }>> {
  const rows = await prisma.$queryRaw<Array<{ tbl: string; n: bigint }>>`SELECT tbl, count(*) AS n FROM test_row_origin WHERE origin LIKE ${pattern} GROUP BY tbl ORDER BY tbl`;
  return rows.map((r) => ({ tbl: r.tbl, n: Number(r.n) }));
}

export interface RowDifference {
  tbl: string;
  rowId: string;
  kind: 'BORRADA' | 'MODIFICADA';
  before: Record<string, unknown>;
  after: Record<string, unknown> | null;
}

/** Guarda la foto de las filas preexistentes de esta corrida. Devuelve cuántas filas tiene. */
export async function snapshotPreexisting(prisma: PrismaClient, runId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: number }>>`SELECT test_snapshot_rows(${runId}) AS total`;
  return Number(rows[0]?.total ?? 0);
}

/** Qué filas preexistentes se borraron o cambiaron de valor desde la foto. */
export async function preexistingDifferences(prisma: PrismaClient, runId: string): Promise<RowDifference[]> {
  const rows = await prisma.$queryRaw<Array<{ tbl: string; row_id: string; kind: RowDifference['kind']; before: Record<string, unknown>; after: Record<string, unknown> | null }>>`
    SELECT tbl, row_id, kind, before, after FROM test_diff_rows(${runId}) ORDER BY tbl, row_id`;
  return rows.map((r) => ({ tbl: r.tbl, rowId: r.row_id, kind: r.kind, before: r.before, after: r.after }));
}

/** Quita la foto de la corrida cuando ya se comprobó. */
export async function dropSnapshot(prisma: PrismaClient, runId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM test_preexisting WHERE run = ${runId}`;
}

/** Texto corto de las diferencias (solo las columnas que cambiaron) para el mensaje de error. */
export function describeDifferences(diffs: RowDifference[], limit = 15): string {
  return diffs
    .slice(0, limit)
    .map((d) => {
      if (d.kind === 'BORRADA' || !d.after) return `${d.tbl}/${d.rowId}: BORRADA`;
      const changed = Object.keys(d.before).filter((c) => JSON.stringify(d.before[c]) !== JSON.stringify(d.after?.[c]));
      return `${d.tbl}/${d.rowId}: MODIFICADA (${changed.join(', ')})`;
    })
    .concat(diffs.length > limit ? [`… y ${diffs.length - limit} más`] : [])
    .join('\n');
}

export interface UnfinishedRuns {
  /** Corridas cuya foto de filas preexistentes sigue en la base: no terminaron, o terminaron con residuos o cambios. */
  snapshots: Array<{ run: string; rows: number }>;
  /** Filas creadas por pruebas que nadie borró. */
  ledgerRows: number;
}

/** Restos de corridas anteriores en la base de pruebas. En una base nueva (sin las tablas del registro) no hay ninguno. */
export async function findUnfinishedRuns(prisma: PrismaClient): Promise<UnfinishedRuns> {
  const exists = await prisma.$queryRaw<Array<{ snapshots: string | null; ledger: string | null }>>`
    SELECT to_regclass('public.test_preexisting')::text AS snapshots, to_regclass('public.test_row_origin')::text AS ledger`;
  const snapshots = exists[0]?.snapshots
    ? (await prisma.$queryRaw<Array<{ run: string; rows: bigint }>>`SELECT run, count(*) AS rows FROM test_preexisting GROUP BY run ORDER BY run`).map((r) => ({ run: r.run, rows: Number(r.rows) }))
    : [];
  const ledger = exists[0]?.ledger ? await prisma.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM test_row_origin` : [];
  return { snapshots, ledgerRows: Number(ledger[0]?.n ?? 0) };
}

/** Mensaje con el que se detiene una corrida que encuentra restos. Solo menciona la base y el contenedor de PRUEBAS. */
export function unfinishedRunsMessage(found: UnfinishedRuns): string {
  const runs = found.snapshots.map((s) => `${s.run} (${s.rows} filas en la foto)`).join(', ') || 'ninguna foto';
  return [
    'La base de pruebas tiene restos de una corrida anterior que se interrumpió o terminó con residuos o cambios inesperados',
    `(corridas: ${runs}; filas de pruebas sin borrar: ${found.ledgerRows}). No se ejecutó ninguna prueba: aceptar esta base daría por buenos`,
    'valores que una prueba dejó cambiados. Recupérela y vuelva a ejecutar:',
    '  - Recrearla (recomendado; es desechable y sin volumen):',
    '      docker compose -f docker-compose.test-db.yml down',
    '      docker compose -f docker-compose.test-db.yml up -d --wait',
    '      (en server/) pnpm run test:db:prepare',
    '  - O recuperar esa corrida sin recrear: docs/PRUEBAS_DE_INTEGRACION.md, sección 3.5.',
  ].join(String.fromCharCode(10));
}
