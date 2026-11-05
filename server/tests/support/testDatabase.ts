/**
 * Regla única sobre qué base de datos pueden tocar las pruebas de integración: SOLO una base de pruebas, cuyo nombre termina en
 * «_test» (la de la CI es `sit_db_test`; la local, `sit_db_test` del compose de pruebas). La base de desarrollo (`sit_db`) nunca.
 * `TEST_DATABASE_URL` tiene prioridad sobre `DATABASE_URL`, así el comando habitual no depende de lo que diga el `.env`.
 */
export const TEST_DATABASE_SUFFIX = '_test';

/** Nombre de la base de una URL de conexión, o '' si no se puede leer. */
export function databaseNameOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
}

/** La URL con la que corren las pruebas: la de pruebas si se definió, o la general (la CI define solo ésta). */
export function effectiveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.TEST_DATABASE_URL || env.DATABASE_URL;
}

export function isTestDatabase(url: string | undefined): boolean {
  return databaseNameOf(url).endsWith(TEST_DATABASE_SUFFIX);
}

export function refusalMessage(url: string | undefined): string {
  return (
    `Las pruebas de integración solo corren contra una base exclusiva de pruebas (nombre terminado en «${TEST_DATABASE_SUFFIX}»), ` +
    `y la configurada es «${databaseNameOf(url) || 'sin definir'}». Defina TEST_DATABASE_URL con esa base ` +
    `(p. ej. postgresql://sit_user:sit_pass@localhost:5433/sit_db_test; ver docs/PRUEBAS_DE_INTEGRACION.md). ` +
    'No se ejecutan para no modificar la base de desarrollo.'
  );
}

export function connectedRefusalMessage(realName: string): string {
  return (
    `La conexión configurada llega a la base «${realName}», que no es una base de pruebas (su nombre debe terminar en «${TEST_DATABASE_SUFFIX}»). ` +
    'Se detuvo todo antes de ejecutar ninguna prueba para no modificar esa base. Defina TEST_DATABASE_URL (ver docs/PRUEBAS_DE_INTEGRACION.md).'
  );
}
