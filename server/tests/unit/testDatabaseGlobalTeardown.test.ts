import globalTeardown from '../support/testDatabaseGlobalTeardown';
import * as rowLedger from '../support/rowLedger';

const update = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ systemParameter: { update: (...args: unknown[]) => update(...args) }, $disconnect: jest.fn() })),
}));

// La foto de las filas preexistentes es la marca de «corrida sin cerrar»: solo se descarta si la base quedó limpia.
describe('verificación final de la corrida', () => {
  const original = { ...process.env };
  const none = { snapshots: [], ledgerRows: 0 };
  beforeEach(() => {
    process.env.SIT_TEST_RUN_ID = 'abcd1234';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5433/sit_db_test';
    update.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(rowLedger, 'sweepOrigin').mockResolvedValue(0);
    jest.spyOn(rowLedger, 'findUnfinishedRuns').mockResolvedValue(none);
  });
  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it('con la base limpia descarta la foto y termina sin error', async () => {
    jest.spyOn(rowLedger, 'preexistingDifferences').mockResolvedValue([]);
    const drop = jest.spyOn(rowLedger, 'dropSnapshot').mockResolvedValue();

    await expect(globalTeardown()).resolves.toBeUndefined();

    expect(drop).toHaveBeenCalledWith(expect.anything(), 'abcd1234');
  });

  it('si una fila preexistente cambió, falla y CONSERVA la foto para que la corrida siguiente se detenga', async () => {
    jest
      .spyOn(rowLedger, 'preexistingDifferences')
      .mockResolvedValue([{ tbl: 'campuses', rowId: 'c1', kind: 'MODIFICADA', before: { id: 'c1', is_active: true }, after: { id: 'c1', is_active: false } }]);
    const drop = jest.spyOn(rowLedger, 'dropSnapshot').mockResolvedValue();

    await expect(globalTeardown()).rejects.toThrow(/campuses\/c1: MODIFICADA \(is_active\)[\s\S]*no confiable/);

    expect(drop).not.toHaveBeenCalled();
  });

  it('si quedaron filas de pruebas sin borrar, falla y conserva la foto', async () => {
    jest.spyOn(rowLedger, 'sweepOrigin').mockResolvedValue(2);
    jest.spyOn(rowLedger, 'leftovers').mockResolvedValue([{ tbl: 'campuses', n: 2 }]);
    jest.spyOn(rowLedger, 'findUnfinishedRuns').mockResolvedValue({ snapshots: [], ledgerRows: 2 });
    jest.spyOn(rowLedger, 'preexistingDifferences').mockResolvedValue([]);
    const drop = jest.spyOn(rowLedger, 'dropSnapshot').mockResolvedValue();

    await expect(globalTeardown()).rejects.toThrow(/campuses: 2[\s\S]*no confiable/);

    expect(drop).not.toHaveBeenCalled();
  });

  it('si solo había un parámetro cambiado, lo restaura y esa corrida falla, pero la base queda limpia y la foto se descarta', async () => {
    const parameter = {
      tbl: 'system_parameters',
      rowId: 'p1',
      kind: 'MODIFICADA' as const,
      before: { id: 'p1', key: 'login_max_attempts', value: '5' },
      after: { id: 'p1', key: 'login_max_attempts', value: '9' },
    };
    jest.spyOn(rowLedger, 'preexistingDifferences').mockResolvedValueOnce([parameter]).mockResolvedValueOnce([]);
    const drop = jest.spyOn(rowLedger, 'dropSnapshot').mockResolvedValue();

    await expect(globalTeardown()).rejects.toThrow(/login_max_attempts/);

    expect(update).toHaveBeenCalledWith({ where: { key: 'login_max_attempts' }, data: { value: '5' } });
    expect(drop).toHaveBeenCalledTimes(1);
  });
});
