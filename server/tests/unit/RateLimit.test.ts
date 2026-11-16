import { effectiveMax, rateLimit } from '../../src/interfaces/http/middleware/rateLimit';

describe('effectiveMax', () => {
  it('usa el tope por defecto cuando no hay valor', () => {
    expect(effectiveMax(10, undefined, 'development')).toBe(10);
  });

  it('respeta un entero positivo fuera de producción', () => {
    expect(effectiveMax(10, '500', 'development')).toBe(500);
    expect(effectiveMax(10, ' 40 ', 'test')).toBe(40);
    expect(effectiveMax(10, '500', undefined)).toBe(500);
  });

  it('en producción ignora siempre el valor', () => {
    expect(effectiveMax(10, '500', 'production')).toBe(10);
  });

  it.each(['', '0', '-3', '1.5', 'abc', '1e3', '9999999'])('ignora el valor no válido «%s»', (raw) => {
    expect(effectiveMax(10, raw, 'development')).toBe(10);
  });
});

describe('rateLimit', () => {
  const run = (limiter: ReturnType<typeof rateLimit>) => {
    const next = jest.fn();
    limiter({ ip: '1.1.1.1' } as never, {} as never, next);
    return next.mock.calls[0][0];
  };

  it('deja pasar hasta el tope y responde 429 al siguiente', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2, message: 'tope' });
    expect(run(limiter)).toBeUndefined();
    expect(run(limiter)).toBeUndefined();
    expect(run(limiter)).toMatchObject({ statusCode: 429, message: 'tope' });
  });
});
