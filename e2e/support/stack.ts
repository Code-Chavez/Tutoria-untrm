import { execFileSync } from 'node:child_process';

// Acciones sobre la pila que se está probando (su base de datos y su servidor de correo) que la API no permite: hacer vencer un enlace
// y dejar sin correo al servidor. Se localizan por el PUERTO que publican, no por un nombre fijo: así sirven lo mismo para una pila
// aislada, para el servicio del CI o para el compose de desarrollo, y la prueba nunca toca un contenedor que no sea el de esa pila.
const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8', timeout: 60_000 }).trim();

function containerPublishing(port: string): string {
  const name = docker('ps', '--filter', `publish=${port}`, '--format', '{{.Names}}').split(/\r?\n/)[0];
  if (!name) throw new Error(`Ningún contenedor publica el puerto ${port}; no se puede actuar sobre esa pila.`);
  return name;
}

/** `E2E_DATABASE_URL` (la misma `DATABASE_URL` de la pila probada), o `null` si no se definió. */
export function stackDatabase(): URL | null {
  return process.env.E2E_DATABASE_URL ? new URL(process.env.E2E_DATABASE_URL) : null;
}

/** Ejecuta SQL en la base de la pila probada, dentro del contenedor que publica su puerto. */
export function runSql(sql: string): void {
  const url = stackDatabase();
  if (!url) throw new Error('Defina E2E_DATABASE_URL con la base de la pila probada.');
  const container = containerPublishing(url.port || '5432');
  docker('exec', container, 'psql', '-U', decodeURIComponent(url.username), '-d', url.pathname.slice(1), '-v', 'ON_ERROR_STOP=1', '-c', sql);
}

const smtpPort = () => process.env.E2E_SMTP_PORT ?? '1025';

/** Detiene el servidor de correo de la pila probada y devuelve la función que lo vuelve a levantar. */
export function stopMailServer(): () => void {
  const container = containerPublishing(smtpPort());
  docker('stop', container);
  return () => {
    docker('start', container);
  };
}
