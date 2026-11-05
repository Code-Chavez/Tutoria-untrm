import { describe, it, expect } from 'vitest';
import { accountEmailProblem, emailDomainMessage, isValidEmailFormat, normalizeEmail } from './email';

describe('correo: mismas reglas que el servidor', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(normalizeEmail('  Ana.Torres@UNTRM.edu.pe ')).toBe('ana.torres@untrm.edu.pe');
  });

  it('valida el formato', () => {
    for (const ok of ['ana@untrm.edu.pe', 'ana.t+x@untrm.edu.pe']) expect(isValidEmailFormat(ok)).toBe(true);
    for (const bad of ['', 'sin-arroba', 'ana@', '@untrm.edu.pe', 'ana perez@untrm.edu.pe', `${'a'.repeat(250)}@untrm.edu.pe`]) expect(isValidEmailFormat(bad)).toBe(false);
  });

  it('exige el dominio de la política, sin confundir subdominios ni sufijos', () => {
    const domains = ['untrm.edu.pe'];
    expect(accountEmailProblem('  ANA@UNTRM.edu.pe ', domains)).toBeNull();
    expect(accountEmailProblem('ana@gmail.com', domains)).toBe('El correo debe ser institucional (@untrm.edu.pe)');
    expect(accountEmailProblem('ana@mail.untrm.edu.pe', domains)).not.toBeNull();
    expect(accountEmailProblem('ana@untrm.edu.pe.evil.com', domains)).not.toBeNull();
  });

  it('con una excepción en la política lo dice con todos los dominios', () => {
    expect(emailDomainMessage(['untrm.edu.pe', 'externo.org'])).toBe('El correo debe ser institucional (@untrm.edu.pe o @externo.org)');
    expect(accountEmailProblem('prof@externo.org', ['untrm.edu.pe', 'externo.org'])).toBeNull();
  });

  it('sin la política cargada solo se revisa el formato (el servidor decide el dominio)', () => {
    expect(accountEmailProblem('ana@gmail.com', undefined)).toBeNull();
    expect(accountEmailProblem('sin-arroba', undefined)).toBe('El correo no tiene un formato válido');
  });
});
