/**
 * Comprobación de la configuración de producción (A11). Recibe el entorno *sin valores por defecto*:
 * lo que el operador no definió es un problema, no algo que se rellene con un secreto de ejemplo.
 * Devuelve una lista de problemas (sin incluir nunca el valor de un secreto).
 */
const EXAMPLE_SECRET = /(change|cambia|example|ejemplo|secret|password|dev-|test|default)/i;

const isHttps = (value: string | undefined) => {
  try {
    return !!value && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export function findProductionConfigProblems(source: Record<string, string | undefined>): string[] {
  const problems: string[] = [];

  const jwt = source.JWT_SECRET ?? '';
  if (!jwt) problems.push('JWT_SECRET no está definido');
  else if (jwt.length < 32) problems.push('JWT_SECRET debe tener al menos 32 caracteres');
  else if (EXAMPLE_SECRET.test(jwt)) problems.push('JWT_SECRET parece un valor de ejemplo; genere uno aleatorio (p. ej. openssl rand -hex 48)');

  const db = source.DATABASE_URL ?? '';
  if (!db) problems.push('DATABASE_URL no está definido');
  else if (/:sit_pass@/.test(db)) problems.push('DATABASE_URL usa la contraseña de desarrollo de la base de datos');

  if (!isHttps(source.CORS_ORIGIN)) problems.push('CORS_ORIGIN debe ser la URL https:// pública del cliente');
  if (!isHttps(source.PUBLIC_APP_URL)) problems.push('PUBLIC_APP_URL debe ser la URL https:// pública del cliente');
  if (!source.SMTP_HOST) problems.push('SMTP_HOST no está definido: sin correo no se pueden enviar recuperaciones de contraseña');

  const rounds = Number(source.BCRYPT_ROUNDS ?? '12');
  if (!Number.isFinite(rounds) || rounds < 10) problems.push('BCRYPT_ROUNDS debe ser al menos 10');

  return problems;
}

/** En producción, termina el proceso con la lista de problemas si la configuración no es segura. */
export function assertProductionConfig(
  source: Record<string, string | undefined> = process.env,
  exit: (code: number) => never = process.exit,
): void {
  if (source.NODE_ENV !== 'production') return;
  const problems = findProductionConfigProblems(source);
  if (problems.length === 0) return;
  console.error('Configuración de producción insegura; el servidor no arranca:');
  problems.forEach((p) => console.error(`  - ${p}`));
  exit(1);
}
