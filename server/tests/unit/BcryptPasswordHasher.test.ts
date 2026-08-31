import { BcryptPasswordHasher } from '@infrastructure/services/BcryptPasswordHasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('genera un hash distinto del texto plano', async () => {
    const hash = await hasher.hash('Secreto123');
    expect(hash).not.toBe('Secreto123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('produce hashes distintos para la misma clave (salt aleatorio)', async () => {
    const a = await hasher.hash('Secreto123');
    const b = await hasher.hash('Secreto123');
    expect(a).not.toBe(b);
  });

  it('valida la contraseña correcta contra su hash', async () => {
    const hash = await hasher.hash('Secreto123');
    await expect(hasher.compare('Secreto123', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hasher.hash('Secreto123');
    await expect(hasher.compare('Incorrecta1', hash)).resolves.toBe(false);
  });
});
