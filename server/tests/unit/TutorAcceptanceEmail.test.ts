import { buildTutorAcceptanceEmail } from '@application/services/tutorAcceptanceEmail';

// El formulario de aceptación (TT-103) solo pide días y horas; el correo no debe pedir el lugar (LEV-R07).
const input = {
  tutor: { email: 'docente@example.com', firstName: 'Ana', lastName: 'Prueba' },
  school: 'Escuela de Prueba',
  cycle: 3,
  period: '2026-II',
  isException: false,
  link: 'https://sit.example.com/aceptar/abc',
  ttlHours: 72,
};

describe('buildTutorAcceptanceEmail', () => {
  it.each([
    ['ciclo regular', false],
    ['ciclo por excepción', true],
  ])('pide solo los días y las horas, sin el lugar (%s)', (_label, isException) => {
    const mail = buildTutorAcceptanceEmail({ ...input, isException });
    expect(mail.text).toContain('indique los días y las horas en que atenderá a sus estudiantes (la sesión dura 45 minutos)');
    expect(mail.html).toContain('indique los días y las horas en que atenderá a sus estudiantes (la sesión dura 45 minutos)');
    expect(mail.text.toLowerCase()).not.toContain('lugar');
    expect((mail.html ?? '').toLowerCase()).not.toContain('lugar');
  });

  it('conserva el enlace, su vigencia y la alternativa de rechazo', () => {
    const mail = buildTutorAcceptanceEmail(input);
    expect(mail.text).toContain(`Responder: ${input.link}`);
    expect(mail.text).toContain('vence en 72 horas');
    expect(mail.text).toContain('la coordinación asigne a otro docente');
  });
});
