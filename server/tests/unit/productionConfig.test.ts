import { findProductionConfigProblems, assertProductionConfig } from '@infrastructure/config/productionConfig';
import { assertAcceptableAdminPassword, WeakAdminPasswordError } from '@infrastructure/bootstrap/bootstrap';

const valid = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a3f9c1d27b8e4f60918c5d2e7a14b3c9f0e8d7a6b5c4d3e2f1a0b9c8d7e6f5a4',
  DATABASE_URL: 'postgresql://sit_user:Qx9-largaClaveReal@postgres:5432/sit_db',
  CORS_ORIGIN: 'https://sit.untrm.edu.pe',
  PUBLIC_APP_URL: 'https://sit.untrm.edu.pe',
  SMTP_HOST: 'smtp.untrm.edu.pe',
  BCRYPT_ROUNDS: '12',
};

describe('configuración de producción (A11)', () => {
  it('una configuración completa y segura no tiene problemas', () => {
    expect(findProductionConfigProblems(valid)).toEqual([]);
  });

  it.each([
    ['sin JWT_SECRET', { JWT_SECRET: undefined }, 'JWT_SECRET no está definido'],
    ['JWT_SECRET corto', { JWT_SECRET: 'abc123' }, 'al menos 32'],
    ['JWT_SECRET de desarrollo', { JWT_SECRET: 'dev-secret-change-in-production-dev-secret' }, 'valor de ejemplo'],
    ['JWT_SECRET del .env.example', { JWT_SECRET: 'change-this-in-production-change-this-in-production' }, 'valor de ejemplo'],
    ['contraseña de base de desarrollo', { DATABASE_URL: 'postgresql://sit_user:sit_pass@postgres:5432/sit_db' }, 'contraseña de desarrollo'],
    ['CORS sin https', { CORS_ORIGIN: 'http://localhost:5173' }, 'CORS_ORIGIN'],
    ['URL pública sin https', { PUBLIC_APP_URL: 'http://sit.untrm.edu.pe' }, 'PUBLIC_APP_URL'],
    ['sin SMTP', { SMTP_HOST: '' }, 'SMTP_HOST'],
    ['bcrypt débil', { BCRYPT_ROUNDS: '4' }, 'BCRYPT_ROUNDS'],
  ])('rechaza: %s', (_name, override, expected) => {
    const problems = findProductionConfigProblems({ ...valid, ...override });
    expect(problems.join('\n')).toContain(expected);
  });

  it('un secreto aleatorio largo no se confunde con un ejemplo', () => {
    expect(findProductionConfigProblems({ ...valid, JWT_SECRET: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' })).toEqual([]);
  });

  it('los problemas nunca incluyen el valor de un secreto', () => {
    const problems = findProductionConfigProblems({ ...valid, JWT_SECRET: 'dev-secret-change-in-production-dev-secret', DATABASE_URL: 'postgresql://u:sit_pass@h/db' });
    expect(problems.join('\n')).not.toContain('dev-secret-change-in-production-dev-secret');
    expect(problems.join('\n')).not.toContain('sit_pass@');
  });

  it('en producción sin secretos válidos el arranque termina con código 1 y lista los problemas', () => {
    const exit = jest.fn(() => {
      throw new Error('exit');
    }) as unknown as (code: number) => never;
    const errors: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((m) => {
      errors.push(String(m));
    });

    expect(() => assertProductionConfig({ NODE_ENV: 'production' }, exit)).toThrow('exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(errors.join('\n')).toContain('JWT_SECRET');
    spy.mockRestore();
  });

  it('fuera de producción no exige nada', () => {
    const exit = jest.fn() as unknown as (code: number) => never;
    assertProductionConfig({ NODE_ENV: 'development' }, exit);
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('contraseña del primer administrador (A11)', () => {
  it.each(['corta', 'Admin2026!', 'admin2026!', 'Demo2026!', 'changeme', 'password'])('rechaza "%s"', (password) => {
    expect(() => assertAcceptableAdminPassword(password)).toThrow(WeakAdminPasswordError);
  });

  it('acepta una contraseña larga propia', () => {
    expect(() => assertAcceptableAdminPassword('Una-clave-larga-y-propia-2026')).not.toThrow();
  });
});
