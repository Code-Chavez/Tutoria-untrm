import globalSetup from '../support/testDatabaseGlobalSetup';
import * as connectedDatabase from '../support/connectedDatabase';
import * as rowLedger from '../support/rowLedger';

// La comprobación decisiva es contra la base REAL a la que llega la conexión, no contra lo que dice la URL o una variable.
describe('guardia global de las pruebas de integración', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it('aborta si el servidor responde que la base real no es de pruebas, aunque la URL diga «_test»', async () => {
    process.env.TEST_DATABASE_URL = 'postgresql://u:p@localhost:5433/sit_db_test';
    jest.spyOn(connectedDatabase, 'connectedDatabaseName').mockResolvedValue('sit_db');
    const install = jest.spyOn(rowLedger, 'installRowLedger').mockResolvedValue();
    await expect(globalSetup()).rejects.toThrow(/llega a la base «sit_db»/);
    expect(install).not.toHaveBeenCalled(); // en una base que no es de pruebas no se instala nada
  });

  it('deja correr si la base real es de pruebas', async () => {
    process.env.TEST_DATABASE_URL = 'postgresql://u:p@localhost:5433/sit_db_test';
    jest.spyOn(connectedDatabase, 'connectedDatabaseName').mockResolvedValue('sit_db_test');
    const install = jest.spyOn(rowLedger, 'installRowLedger').mockResolvedValue();
    const snapshot = jest.spyOn(rowLedger, 'snapshotPreexisting').mockResolvedValue(0);
    await expect(globalSetup()).resolves.toBeUndefined();
    expect(install).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledTimes(1); // la foto de lo preexistente se toma después de instalar el registro
    expect(process.env.SIT_TEST_RUN_ID).toMatch(/^[0-9a-f]{8}$/);
  });

  it('no consulta nada si las pruebas de integración no se van a ejecutar', async () => {
    delete process.env.TEST_DATABASE_URL;
    delete process.env.REQUIRE_DB_TESTS;
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/sit_db';
    const spy = jest.spyOn(connectedDatabase, 'connectedDatabaseName');
    await expect(globalSetup()).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
