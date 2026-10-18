import { describe, it, expect } from 'vitest';
import { recipientAfter, recipientBefore } from './requestRecipient';

describe('a quién llega mi solicitud (U02)', () => {
  it('antes de enviar dice quién la recibe, según el caso, sin prometer plazos', () => {
    expect(recipientBefore({ kind: 'tutor', name: 'Elena Ramírez' })).toBe('Tu solicitud la recibirá tu tutor Elena Ramírez. Te avisaremos en el sistema cuando responda.');
    expect(recipientBefore({ kind: 'coordinator', name: 'Rosa Mendoza' })).toContain('Aún no tienes tutor asignado');
    expect(recipientBefore({ kind: 'coordinator', name: 'Rosa Mendoza' })).toContain('la coordinación de tu escuela (Rosa Mendoza)');
    expect(recipientBefore({ kind: 'dbu', name: 'Admin' })).toContain('Bienestar Universitario (Admin)');
    for (const kind of ['tutor', 'coordinator', 'dbu'] as const) expect(recipientBefore({ kind, name: 'X' })).not.toMatch(/horas|días|plazo/i);
  });

  it('sin saber a quién llega no dice nada (la solicitud igual se registra)', () => {
    expect(recipientBefore(null)).toBe('');
  });

  it('después de enviar nombra a quien la recibió; sin saberlo, cae en el texto por rol', () => {
    expect(recipientAfter({ kind: 'tutor', name: 'Elena Ramírez' }, 'tutor')).toBe('Solicitud registrada: la recibió tu tutor Elena Ramírez. Te avisaremos en el sistema cuando responda.');
    expect(recipientAfter({ kind: 'coordinator', name: 'Rosa Mendoza' }, 'coordinator')).toContain('la coordinación de tu escuela (Rosa Mendoza)');
    expect(recipientAfter(null, 'tutor')).toContain('enviada a tu tutor');
    expect(recipientAfter(null, 'coordinator')).toContain('la coordinación de tu escuela');
  });
});
