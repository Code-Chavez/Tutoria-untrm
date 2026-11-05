import { describe, it, expect } from 'vitest';
import { sessionNoticeText } from './sessionNotice';

describe('qué se dice sobre los avisos de una sesión', () => {
  it('sin información no dice nada', () => {
    expect(sessionNoticeText(undefined)).toBe('');
    expect(sessionNoticeText({ notified: 0, notReached: 0 })).toBe('');
  });

  it('si se avisó a todos, lo dice', () => {
    expect(sessionNoticeText({ notified: 1, notReached: 0 })).toBe(' Se avisó al estudiante en el sistema.');
    expect(sessionNoticeText({ notified: 3, notReached: 0 })).toBe(' Se avisó a los 3 estudiantes en el sistema.');
  });

  it('si no se pudo avisar a alguien, lo dice y pide comunicarlo por otro medio (no promete)', () => {
    expect(sessionNoticeText({ notified: 0, notReached: 1 })).toContain('El estudiante no tiene cuenta del portal');
    expect(sessionNoticeText({ notified: 0, notReached: 1 })).toContain('Comunícalo por otro medio');
    expect(sessionNoticeText({ notified: 2, notReached: 1 })).toBe(' Se avisó a 2 en el sistema; 1 no tiene cuenta del portal: avísale por otro medio.');
    expect(sessionNoticeText({ notified: 1, notReached: 2 })).toContain('2 no tienen cuenta del portal');
  });
});
