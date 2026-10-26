import { databaseNameOf, effectiveDatabaseUrl, isTestDatabase, refusalMessage } from '../support/testDatabase';

// La regla que impide que las pruebas de integración modifiquen la base de desarrollo.
describe('base de datos de las pruebas de integración', () => {
  const dev = 'postgresql://sit_user:sit_pass@localhost:5432/sit_db';
  const test = 'postgresql://sit_user:sit_pass@localhost:5433/sit_db_test';

  it('solo una base cuyo nombre termina en «_test» es de pruebas', () => {
    expect(isTestDatabase(test)).toBe(true);
    expect(isTestDatabase('postgresql://u:p@db.ci:5432/sit_db_test?schema=public')).toBe(true);
    expect(isTestDatabase(dev)).toBe(false);
    expect(isTestDatabase('postgresql://u:p@localhost:5432/sit_db_testing')).toBe(false);
    expect(isTestDatabase('postgresql://u:p@localhost:5432/')).toBe(false);
    expect(isTestDatabase(undefined)).toBe(false);
    expect(isTestDatabase('no es una url')).toBe(false);
  });

  it('lee el nombre de la base de la URL', () => {
    expect(databaseNameOf(dev)).toBe('sit_db');
    expect(databaseNameOf(test)).toBe('sit_db_test');
    expect(databaseNameOf(undefined)).toBe('');
  });

  it('TEST_DATABASE_URL tiene prioridad sobre DATABASE_URL (la del .env de desarrollo)', () => {
    expect(effectiveDatabaseUrl({ DATABASE_URL: dev, TEST_DATABASE_URL: test } as NodeJS.ProcessEnv)).toBe(test);
    expect(effectiveDatabaseUrl({ DATABASE_URL: test } as NodeJS.ProcessEnv)).toBe(test); // la CI define solo DATABASE_URL
    expect(effectiveDatabaseUrl({ DATABASE_URL: dev } as NodeJS.ProcessEnv)).toBe(dev);
  });

  it('el rechazo explica qué hacer y no repite las credenciales de la URL configurada', () => {
    const message = refusalMessage('postgresql://usuario:clave-secreta-9@localhost:5432/sit_db');
    expect(message).toContain('TEST_DATABASE_URL');
    expect(message).toContain('«sit_db»');
    expect(message).not.toContain('clave-secreta-9');
    expect(message).not.toContain('usuario:');
  });
});
