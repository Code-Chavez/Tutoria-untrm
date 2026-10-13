import { TtlCache } from '@infrastructure/cache/TtlCache';
import { CachedRoleRepository } from '@infrastructure/repositories/CachedRoleRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Role } from '@domain/entities/Role';

describe('TtlCache', () => {
  it('carga una vez y recuerda el valor hasta que vence', async () => {
    let now = 1_000;
    const cache = new TtlCache<string>(100, () => now);
    const load = jest.fn().mockResolvedValue('v');

    await cache.getOrLoad('k', load);
    now += 99;
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(1);

    now += 2;
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('recuerda también un valor nulo y separa las claves', async () => {
    const cache = new TtlCache<string | null>(1000);
    const load = jest.fn().mockResolvedValue(null);

    await cache.getOrLoad('a', load);
    await cache.getOrLoad('a', load);
    await cache.getOrLoad('b', load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('clear olvida todo', async () => {
    const cache = new TtlCache<number>(1000);
    const load = jest.fn().mockResolvedValue(1);
    await cache.getOrLoad('k', load);

    cache.clear();
    await cache.getOrLoad('k', load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('no guarda el valor si la carga falla', async () => {
    const cache = new TtlCache<number>(1000);
    const load = jest.fn().mockRejectedValueOnce(new Error('db caída')).mockResolvedValue(7);

    await expect(cache.getOrLoad('k', load)).rejects.toThrow('db caída');

    await expect(cache.getOrLoad('k', load)).resolves.toBe(7);
  });
});

describe('CachedRoleRepository', () => {
  const role = { id: 'r1', name: 'Docente Tutor', description: '', permissions: [], createdAt: new Date() } as Role;
  let inner: jest.Mocked<RoleRepository>;
  let now: number;
  let repo: CachedRoleRepository;

  beforeEach(() => {
    now = 0;
    inner = { findById: jest.fn().mockResolvedValue(role), findByName: jest.fn().mockResolvedValue(role), findAll: jest.fn().mockResolvedValue([role]), create: jest.fn().mockResolvedValue(role) };
    repo = new CachedRoleRepository(inner, 30_000, () => now);
  });

  it('lee de la base una sola vez por id y por nombre dentro del plazo', async () => {
    await repo.findById('r1');
    await repo.findById('r1');
    await repo.findByName('Docente Tutor');
    await repo.findByName('Docente Tutor');

    expect(inner.findById).toHaveBeenCalledTimes(1);
    expect(inner.findByName).toHaveBeenCalledTimes(1);
  });

  it('vuelve a leer cuando vence el plazo', async () => {
    await repo.findById('r1');
    now = 30_001;
    await repo.findById('r1');

    expect(inner.findById).toHaveBeenCalledTimes(2);
  });

  it('crear un rol invalida lo recordado (un nombre antes inexistente ya se encuentra)', async () => {
    inner.findByName.mockResolvedValueOnce(null);
    expect(await repo.findByName('Nuevo')).toBeNull();

    await repo.create({ name: 'Nuevo', description: '' });
    inner.findByName.mockResolvedValue(role);

    expect(await repo.findByName('Nuevo')).toBe(role);
  });

  it('el listado completo no se guarda', async () => {
    await repo.findAll();
    await repo.findAll();

    expect(inner.findAll).toHaveBeenCalledTimes(2);
  });
});
