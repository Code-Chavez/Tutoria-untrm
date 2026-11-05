import {
  accountEmailProblem,
  createEmailPolicy,
  emailDomainMessage,
  isValidEmailFormat,
  isValidOptionalEmail,
  normalizeEmail,
  parseAllowedDomains,
} from '@application/validation/email';

describe('reglas del correo (RF-01): una sola fuente para formularios, importación y casos de uso', () => {
  describe('normalización', () => {
    it('quita espacios exteriores y pasa a minúsculas', () => {
      expect(normalizeEmail('  Ana.Torres@UNTRM.edu.pe ')).toBe('ana.torres@untrm.edu.pe');
      expect(normalizeEmail('ana@untrm.edu.pe')).toBe('ana@untrm.edu.pe');
    });
  });

  describe('formato', () => {
    it.each(['ana@untrm.edu.pe', 'ana.torres+tutorias@untrm.edu.pe', 'a@b.co'])('acepta «%s»', (email) => {
      expect(isValidEmailFormat(email)).toBe(true);
    });

    it.each(['', 'sin-arroba', 'ana@', '@untrm.edu.pe', 'ana perez@untrm.edu.pe', 'ana@@untrm.edu.pe', `${'a'.repeat(250)}@untrm.edu.pe`])('rechaza «%s»', (email) => {
      expect(isValidEmailFormat(email)).toBe(false);
    });

    it('un correo opcional vacío es válido; si viene, se normaliza antes de validar', () => {
      expect(isValidOptionalEmail('')).toBe(true);
      expect(isValidOptionalEmail('  Ana@UNTRM.edu.pe ')).toBe(true);
      expect(isValidOptionalEmail('mal')).toBe(false);
    });
  });

  describe('política de dominio de las cuentas', () => {
    it('sin configurar rige RF-01: solo untrm.edu.pe', () => {
      expect(parseAllowedDomains(undefined)).toEqual(['untrm.edu.pe']);
      expect(parseAllowedDomains('')).toEqual(['untrm.edu.pe']);
      expect(parseAllowedDomains('  , ;')).toEqual(['untrm.edu.pe']);
    });

    it('acepta varios dominios (comas, espacios, con o sin «@», sin repetidos, en minúsculas)', () => {
      expect(parseAllowedDomains('UNTRM.edu.pe, @externo.org  untrm.edu.pe')).toEqual(['untrm.edu.pe', 'externo.org']);
    });

    it('un dominio mal escrito es un error de configuración, no algo que se ignore en silencio', () => {
      expect(() => parseAllowedDomains('untrm.edu.pe, sin punto')).toThrow(/dominios inválidos/);
      expect(() => parseAllowedDomains('untrm')).toThrow(/untrm/);
    });

    const policy = createEmailPolicy(undefined);

    it('acepta el correo institucional, sin importar mayúsculas ni espacios', () => {
      expect(accountEmailProblem('ana@untrm.edu.pe', policy)).toBeNull();
      expect(accountEmailProblem('  ANA@UNTRM.EDU.PE ', policy)).toBeNull();
    });

    it('rechaza otro dominio y dice cuál se espera', () => {
      expect(accountEmailProblem('ana@gmail.com', policy)).toBe('El correo debe ser institucional (@untrm.edu.pe) («ana@gmail.com»)');
    });

    it('no confunde dominios parecidos: ni subdominios ni sufijos', () => {
      for (const email of ['ana@untrm.edu.pe.evil.com', 'ana@evil-untrm.edu.pe', 'ana@mail.untrm.edu.pe', 'ana@untrm.edu']) {
        expect(accountEmailProblem(email, policy)).not.toBeNull();
      }
    });

    it('una excepción es explícita: solo pasa el dominio agregado a la política', () => {
      const withExternal = createEmailPolicy('untrm.edu.pe, externo.org');
      expect(accountEmailProblem('prof@externo.org', withExternal)).toBeNull();
      expect(accountEmailProblem('prof@otro.org', withExternal)).toMatch(/@untrm.edu.pe o @externo.org/);
      expect(emailDomainMessage(withExternal)).toBe('El correo debe ser institucional (@untrm.edu.pe o @externo.org)');
    });

    it('un correo mal formado se informa como formato, no como dominio', () => {
      expect(accountEmailProblem('sin-arroba', policy)).toBe('El correo no tiene un formato válido («sin-arroba»)');
      expect(accountEmailProblem('   ', policy)).toBe('El correo no tiene un formato válido');
    });
  });
});
