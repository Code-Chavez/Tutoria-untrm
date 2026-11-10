import { beforeEach, describe, expect, it } from 'vitest';
import { forgetReturnTo, isSafeReturnPath, rememberReturnTo, takeReturnTo } from './returnTo';

describe('returnTo', () => {
  beforeEach(() => sessionStorage.clear());

  it('guarda la vista con sus filtros y la devuelve una sola vez a la misma persona', () => {
    rememberReturnTo('/tutorados?escuela=s1&page=2#fila', 'u1');

    expect(takeReturnTo('u1')).toBe('/tutorados?escuela=s1&page=2#fila');
    expect(takeReturnTo('u1')).toBeNull();
  });

  it('otra persona no vuelve a la vista de quien tenía la sesión, y el dato se descarta', () => {
    rememberReturnTo('/expediente/123', 'u1');

    expect(takeReturnTo('u2')).toBeNull();
    expect(takeReturnTo('u1')).toBeNull();
  });

  it('sin persona guardada (visita directa a una URL protegida) puede volver cualquiera', () => {
    rememberReturnTo('/certificados?periodo=p1');
    expect(takeReturnTo('u9')).toBe('/certificados?periodo=p1');
  });

  it('pasadas 12 horas ya no se usa', () => {
    const t0 = 1_000_000_000_000;
    rememberReturnTo('/certificados', 'u1', t0);
    expect(takeReturnTo('u1', t0 + 12 * 3_600_000 + 1)).toBeNull();

    rememberReturnTo('/certificados', 'u1', t0);
    expect(takeReturnTo('u1', t0 + 11 * 3_600_000)).toBe('/certificados');
  });

  it('solo acepta rutas internas seguras', () => {
    const unsafe = ['https://evil.example/x', '//evil.example', '/\\evil', 'tutorados', '/ok\nsplit', '/login', '/login?x=1', '/reset-password/abc', '/activar-cuenta/abc', '/aceptar-tutoria/abc', `/${'a'.repeat(2001)}`, 5, null];
    for (const path of unsafe) expect(isSafeReturnPath(path)).toBe(false);
    for (const path of ['/', '/tutorados', '/informes?a=1&b=2', '/loginfo', '/certificados#x']) expect(isSafeReturnPath(path)).toBe(true);

    rememberReturnTo('https://evil.example', 'u1');
    expect(takeReturnTo('u1')).toBeNull();
  });

  it('ignora un registro dañado y puede olvidarse', () => {
    sessionStorage.setItem('sit:return-to', '{no es json');
    expect(takeReturnTo('u1')).toBeNull();

    rememberReturnTo('/informes', 'u1');
    forgetReturnTo();
    expect(takeReturnTo('u1')).toBeNull();
  });
});
