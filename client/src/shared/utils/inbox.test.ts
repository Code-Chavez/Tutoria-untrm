import { describe, it, expect } from 'vitest';
import { matchesSearch, normalizeText, parseFilterParam, waitingText } from './inbox';

describe('utilidades de bandejas', () => {
  it('busca sin importar mayúsculas ni tildes, y una búsqueda vacía acepta todo', () => {
    expect(normalizeText('  Álgebra  ')).toBe('algebra');
    expect(matchesSearch('algebra', ['Apoyo en Álgebra'])).toBe(true);
    expect(matchesSearch('TORRES', [null, 'Ana Torres'])).toBe(true);
    expect(matchesSearch('', ['x'])).toBe(true);
    expect(matchesSearch('zzz', ['Ana', undefined, null])).toBe(false);
  });

  it('dice cuánto lleva esperando algo, sin inventar plazos', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(waitingText('2026-10-17T08:00:00Z', now)).toBe('hoy');
    expect(waitingText('2026-10-16T08:00:00Z', now)).toBe('hace 1 día');
    expect(waitingText('2026-10-08T08:00:00Z', now)).toBe('hace 9 días');
  });

  it('un parámetro desconocido cae en el valor por defecto', () => {
    expect(parseFilterParam('b', ['a', 'b'] as const, 'a')).toBe('b');
    expect(parseFilterParam('zzz', ['a', 'b'] as const, 'a')).toBe('a');
    expect(parseFilterParam(null, ['a', 'b'] as const, 'a')).toBe('a');
  });
});
