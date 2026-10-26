import { lockModeFor } from '../support/globalStateLock';
import { ORIGIN_PREFIX, originName, withApplicationName } from '../support/rowLedger';

describe('registro de origen de las filas de las pruebas', () => {
  it('el origen de cada archivo lleva la corrida, el proceso y el archivo, y cabe en application_name (63)', () => {
    const name = originName('a1b2c3d4', 4242, 'C:\\repo\\server\\tests\\integration\\cycleTutors.test.ts');
    expect(name).toBe(`${ORIGIN_PREFIX}a1b2c3d4:4242:cycleTutors`);
    expect(originName('a1b2c3d4', 4242, '/x/' + 'larguísimo'.repeat(20) + '.test.ts').length).toBeLessThanOrEqual(63);
  });

  it('cambia solo el application_name de la URL de conexión', () => {
    const url = withApplicationName('postgresql://sit_user:sit_pass@localhost:5433/sit_db_test?schema=public', 'sit-jest:x:y');
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/sit_db_test');
    expect(parsed.searchParams.get('schema')).toBe('public');
    expect(parsed.searchParams.get('application_name')).toBe('sit-jest:x:y');
    expect(parsed.host).toBe('localhost:5433');
  });

  it('solo los archivos que cambian configuración global toman el candado exclusivo', () => {
    expect(lockModeFor('/repo/server/tests/integration/securityParameters.test.ts')).toBe('exclusive');
    expect(lockModeFor('C:\\repo\\server\\tests\\integration\\securityParameters.test.ts')).toBe('exclusive');
    expect(lockModeFor('/repo/server/tests/integration/periodClosure.test.ts')).toBe('exclusive');
    expect(lockModeFor('/repo/server/tests/integration/cycleTutors.test.ts')).toBe('shared');
  });
});
