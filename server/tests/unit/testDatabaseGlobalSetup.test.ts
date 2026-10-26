import globalSetup from '../support/testDatabaseGlobalSetup';
import * as testDatabase from '../support/testDatabase';

// La comprobación decisiva es contra la base REAL a la que llega la conexión, no contra lo que dice la URL o una variable.
describe('guardia global de las pruebas de integración', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it('aborta si el servidor responde que la base real no es de pruebas, aunque la URL diga «_test»', async () => {
    process.env.TEST_DATABASE_URL = 'postgresql://u:p@localhost:5433/sit_db_test';
    jest.spyOn(testDatabase, 'connectedDatabaseName').mockResolvedValue('sit_db');
    await expect(globalSetup()).rejects.toThrow(/llega a la base «sit_db»/);
  });

  it('deja correr si la base real es de pruebas', async () => {
    process.env.TEST_DATABASE_URL = 'postgresql://u:p@localhost:5433/sit_db_test';
    jest.spyOn(testDatabase, 'connectedDatabaseName').mockResolvedValue('sit_db_test');
    await expect(globalSetup()).resolves.toBeUndefined();
  });

  it('no consulta nada si las pruebas de integración no se van a ejecutar', async () => {
    delete process.env.TEST_DATABASE_URL;
    delete process.env.REQUIRE_DB_TESTS;
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/sit_db';
    const spy = jest.spyOn(testDatabase, 'connectedDatabaseName');
    await expect(globalSetup()).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
