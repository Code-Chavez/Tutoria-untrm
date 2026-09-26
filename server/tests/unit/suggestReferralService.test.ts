import { suggestReferralService } from '@domain/entities/StudentReferral';

describe('suggestReferralService', () => {
  it('devuelve null si no se marcó ningún aspecto', () => {
    expect(suggestReferralService([])).toBeNull();
  });

  it('sugiere ESCUELA para aspectos académicos', () => {
    expect(suggestReferralService(['ACADEMIC_AT_RISK_OF_FAILING'])).toBe('ESCUELA');
  });

  it('sugiere PSICOLOGIA para aspectos sociales', () => {
    expect(suggestReferralService(['SOCIAL_VERBALLY_AGGRESSIVE'])).toBe('PSICOLOGIA');
  });

  it('sugiere SALUD para aspectos de apariencia', () => {
    expect(suggestReferralService(['APPEARANCE_HAGGARD'])).toBe('SALUD');
  });

  it('sugiere PSICOLOGIA para aspectos de salud mental', () => {
    expect(suggestReferralService(['MENTAL_HEALTH_ANXIOUS'])).toBe('PSICOLOGIA');
  });

  it('sugiere el servicio de la categoría con más aspectos marcados', () => {
    const result = suggestReferralService([
      'ACADEMIC_AT_RISK_OF_FAILING',
      'MENTAL_HEALTH_ANXIOUS',
      'MENTAL_HEALTH_DEPRESSED_SAD',
    ]);
    expect(result).toBe('PSICOLOGIA');
  });

  it('desempata priorizando salud mental sobre lo académico', () => {
    const result = suggestReferralService(['ACADEMIC_AT_RISK_OF_FAILING', 'MENTAL_HEALTH_ANXIOUS']);
    expect(result).toBe('PSICOLOGIA');
  });

  it('nunca sugiere ASISTENCIA_SOCIAL (no tiene aspecto asociado en el checklist)', () => {
    const result = suggestReferralService([
      'ACADEMIC_AT_RISK_OF_FAILING',
      'SOCIAL_IMPULSIVE',
      'APPEARANCE_HAGGARD',
      'MENTAL_HEALTH_ANXIOUS',
    ]);
    expect(result).not.toBe('ASISTENCIA_SOCIAL');
  });
});
