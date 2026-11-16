import { DEMO_PREFIX, formatDemoCertificateNumber, isDemoCertificateNumber } from '../src/domain/certification/certificateNumber';

describe('número de registro del certificado (demostración)', () => {
  it('forma el número con prefijo DEMO-, secuencia de tres cifras, año y siglas', () => {
    expect(formatDemoCertificateNumber(1, 2026, 'fisme', 'epis')).toBe('DEMO-001-2026/UNTRM/FISME-EPIS');
    expect(formatDemoCertificateNumber(123, 2026, 'FISME', 'EPIS')).toBe('DEMO-123-2026/UNTRM/FISME-EPIS');
    expect(formatDemoCertificateNumber(1000, 2027, 'FAC', 'ESC')).toBe('DEMO-1000-2027/UNTRM/FAC-ESC');
  });

  it('todo número de demostración se reconoce por su prefijo', () => {
    expect(isDemoCertificateNumber(formatDemoCertificateNumber(5, 2026, 'FAC', 'ESC'))).toBe(true);
    expect(isDemoCertificateNumber('001-2025/UNTRM/FISME-EPIS')).toBe(false);
    expect(DEMO_PREFIX).toBe('DEMO-');
  });

  it.each([
    ['secuencia cero', 0, 2026, 'FAC', 'ESC'],
    ['secuencia negativa', -1, 2026, 'FAC', 'ESC'],
    ['secuencia decimal', 1.5, 2026, 'FAC', 'ESC'],
    ['año fuera de rango', 1, 1999, 'FAC', 'ESC'],
    ['siglas de facultad vacías', 1, 2026, '', 'ESC'],
    ['siglas con símbolos', 1, 2026, 'FAC/X', 'ESC'],
    ['siglas demasiado largas', 1, 2026, 'FAC', 'ABCDEFGHIJKLM'],
  ])('rechaza %s', (_name, sequence, year, faculty, school) => {
    expect(() => formatDemoCertificateNumber(sequence, year, faculty, school)).toThrow(RangeError);
  });
});
