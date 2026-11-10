import { CertificateTextSettings } from '@application/use-cases/certification/CertificateTextSettings';
import { CertificateForbiddenError } from '@application/use-cases/certification/CertificateQueryUseCases';
import { InvalidCertificateInputError } from '@application/use-cases/certification/CertificateWorkflowUseCases';
import { DEMO_TEMPLATE } from '@domain/certification/certificateDocument';

const school = { id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1' };
const template = { id: 'tpl1', name: 'Demostración', version: 1, isDemo: true, title: 'CERTIFICADO', bodyText: 'Texto {escuela} del periodo {periodo}, aprobado con {resolucion}.' };

function build(over: { scope?: { kind: 'ALL' } | { kind: 'SCHOOLS'; schoolIds: string[] }; school?: unknown } = {}) {
  const scope = { resolve: jest.fn().mockResolvedValue(over.scope ?? { kind: 'ALL' }) };
  const schools = { findById: jest.fn().mockResolvedValue(over.school === undefined ? school : over.school) };
  const templates = { ensure: jest.fn().mockResolvedValue(template), update: jest.fn().mockResolvedValue(undefined) };
  const settings = { find: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue(undefined) };
  const audit = { create: jest.fn().mockResolvedValue({}) };
  const useCase = new CertificateTextSettings(scope as never, schools as never, templates as never, settings as never, audit as never);
  return { useCase, templates, settings, audit };
}

const BRANDING = ['certificados:consultar', 'branding:manage'];
const ISSUER = ['certificados:consultar', 'certificados:emitir'];
const VALID_TEMPLATE = { title: 'Constancia', bodyText: 'Docente de la escuela {escuela}, periodo {periodo}, resolución {resolucion}.' };

describe('CertificateTextSettings (issue #271)', () => {
  describe('lectura', () => {
    it('devuelve los valores guardados, los predeterminados y quién puede editar', async () => {
      const { useCase, settings } = build();
      settings.find.mockResolvedValue({ department: 'Departamento X', signatoryName: 'Dr. Ana', signatoryRole: 'Directora' });

      const view = await useCase.view('u1', 's1', BRANDING);

      expect(view.template).toEqual({ title: 'CERTIFICADO', bodyText: template.bodyText, editable: true });
      expect(view.school).toEqual({ department: 'Departamento X', signatoryName: 'Dr. Ana', signatoryRole: 'Directora', editable: true });
      expect(view.defaults).toMatchObject({ title: DEMO_TEMPLATE.title, department: 'Ingeniería de Sistemas', signatoryRole: 'Director de Escuela de Ingeniería de Sistemas' });
      expect(view.variables).toContain('{escuela}');
    });

    it('quien emite en su escuela edita sus datos pero no el texto de la plantilla', async () => {
      const { useCase } = build({ scope: { kind: 'SCHOOLS', schoolIds: ['s1'] } });
      const view = await useCase.view('u1', 's1', ISSUER);
      expect(view.template.editable).toBe(false);
      expect(view.school.editable).toBe(true);
    });

    it('fuera del alcance o con una escuela inexistente responde sin permiso', async () => {
      await expect(build({ scope: { kind: 'SCHOOLS', schoolIds: ['otra'] } }).useCase.view('u1', 's1', ISSUER)).rejects.toBeInstanceOf(CertificateForbiddenError);
      await expect(build({ school: null }).useCase.view('u1', 's1', BRANDING)).rejects.toBeInstanceOf(CertificateForbiddenError);
    });
  });

  describe('título y texto', () => {
    it('guarda título y texto limpios y lo deja en la bitácora', async () => {
      const { useCase, templates, audit } = build();
      await useCase.saveTemplate('u1', 's1', BRANDING, { title: '  Constancia ', bodyText: VALID_TEMPLATE.bodyText }, '10.0.0.1');

      expect(templates.update).toHaveBeenCalledWith('tpl1', { title: 'Constancia', bodyText: VALID_TEMPLATE.bodyText });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', action: 'CERTIFICATE_TEXT_SAVED', entity: 'CertificateTemplate', entityId: 'tpl1', ipAddress: '10.0.0.1' }));
    });

    it('rechaza título o texto vacíos, largos o con caracteres de control', async () => {
      const { useCase, templates } = build();
      const bad = [
        { ...VALID_TEMPLATE, title: '  ' },
        { ...VALID_TEMPLATE, title: 'x'.repeat(61) },
        { ...VALID_TEMPLATE, bodyText: 'muy corto' },
        { ...VALID_TEMPLATE, bodyText: 'x'.repeat(2001) },
        { ...VALID_TEMPLATE, bodyText: `Texto con salto\u0000de control suficientemente largo` },
        { title: 5, bodyText: VALID_TEMPLATE.bodyText },
      ];
      for (const input of bad) await expect(useCase.saveTemplate('u1', 's1', BRANDING, input, null)).rejects.toBeInstanceOf(InvalidCertificateInputError);
      expect(templates.update).not.toHaveBeenCalled();
    });

    it('solo lo cambia quien tiene alcance institucional y permiso de identidad visual', async () => {
      await expect(build().useCase.saveTemplate('u1', 's1', ISSUER, VALID_TEMPLATE, null)).rejects.toBeInstanceOf(CertificateForbiddenError);
      await expect(build({ scope: { kind: 'SCHOOLS', schoolIds: ['s1'] } }).useCase.saveTemplate('u1', 's1', BRANDING, VALID_TEMPLATE, null)).rejects.toBeInstanceOf(CertificateForbiddenError);
    });
  });

  describe('departamento y autoridad de la escuela', () => {
    it('guarda los datos limpios; un valor vacío los quita', async () => {
      const { useCase, settings, audit } = build();
      await useCase.saveSchool('u1', 's1', ISSUER, { department: '  Departamento   de Ingeniería ', signatoryName: 'Dr. Ana Pérez', signatoryRole: '   ' }, '10.0.0.1');

      expect(settings.save).toHaveBeenCalledWith('s1', { department: 'Departamento de Ingeniería', signatoryName: 'Dr. Ana Pérez', signatoryRole: null });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_TEXT_SAVED', entity: 'CertificateSchoolSettings', entityId: 's1', ipAddress: '10.0.0.1' }));
    });

    it('rechaza valores demasiado largos o con caracteres de control', async () => {
      const { useCase, settings } = build();
      for (const input of [
        { department: 'x'.repeat(121), signatoryName: null, signatoryRole: null },
        { department: null, signatoryName: 'Dr.\u0007Ana', signatoryRole: null },
        { department: null, signatoryName: null, signatoryRole: 7 },
      ]) await expect(useCase.saveSchool('u1', 's1', ISSUER, input, null)).rejects.toBeInstanceOf(InvalidCertificateInputError);
      expect(settings.save).not.toHaveBeenCalled();
    });

    it('sin permiso para emitir ni identidad visual, o fuera de su escuela, responde sin permiso', async () => {
      const input = { department: null, signatoryName: 'Dr. Ana', signatoryRole: null };
      await expect(build().useCase.saveSchool('u1', 's1', ['certificados:consultar'], input, null)).rejects.toBeInstanceOf(CertificateForbiddenError);
      await expect(build({ scope: { kind: 'SCHOOLS', schoolIds: ['otra'] } }).useCase.saveSchool('u1', 's1', ISSUER, input, null)).rejects.toBeInstanceOf(CertificateForbiddenError);
    });
  });
});
