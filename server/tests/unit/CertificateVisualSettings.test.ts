import { CertificateVisualSettings } from '@application/use-cases/certification/CertificateVisualSettings';
import { CertificateForbiddenError } from '@application/use-cases/certification/CertificateQueryUseCases';
import { composeCertificateText, DEMO_TEMPLATE } from '@domain/certification/certificateDocument';
import { DemoCertificatePdfRenderer } from '@infrastructure/export/DemoCertificatePdfRenderer';
import { isCertificateImage } from '@infrastructure/export/certificateImage';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2kAAAAASUVORK5CYII=', 'base64');

describe('diseño del certificado', () => {
  it('rechaza imágenes truncadas y genera el PDF con los cuatro recursos', async () => {
    expect(isCertificateImage(image, 'png')).toBe(true);
    expect(isCertificateImage(image.subarray(0, -5), 'png')).toBe(false);
    const text = composeCertificateText({
      title: DEMO_TEMPLATE.title, bodyTemplate: DEMO_TEMPLATE.bodyText, number: 'DEMO-001', tutorName: 'Docente de prueba',
      schoolName: 'Sistemas', facultyName: 'Ingeniería', department: 'Sistemas', periodName: '2026-II',
      resolutionNumber: '010', city: 'Chachapoyas', issuedOn: new Date('2026-11-08'),
    });
    const pdf = await new DemoCertificatePdfRenderer().render(text, {
      signature: image, universityLogo: image, facultyLogo: image, watermark: image,
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Subtype \/Image/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('reutiliza el logo de facultad y limita la firma a su cuenta y escuela', async () => {
    const stored = new Map<string, Buffer>();
    const store = {
      list: async (keys: string[]) => keys.filter((key) => stored.has(key)),
      read: async () => stored,
      save: async (key: string, bytes: Buffer | null) => { if (bytes) stored.set(key, bytes); else stored.delete(key); },
    };
    const settings = new CertificateVisualSettings(
      { resolve: async (actor: string) => actor === 'admin' ? { kind: 'ALL' } : { kind: 'SCHOOLS', schoolIds: ['school'] } } as never,
      { findById: async (id: string) => ({ id, facultyId: 'faculty' }) } as never,
      store,
    );
    await settings.save('admin', 'school', ['branding:manage'], 'facultyLogo', image);
    await settings.save('issuer', 'school', ['certificados:emitir'], 'signature', image);
    await expect(settings.save('issuer', 'foreign', ['certificados:emitir'], 'signature', image)).rejects.toBeInstanceOf(CertificateForbiddenError);
    await expect(settings.save('issuer', 'school', ['certificados:emitir'], 'universityLogo', image)).rejects.toBeInstanceOf(CertificateForbiddenError);
    expect(await settings.forDocument('issuer', 'school', 'faculty')).toMatchObject({ facultyLogo: image, signature: image });
    expect(await settings.forDocument('other', 'school', 'faculty')).toMatchObject({ facultyLogo: image, signature: undefined });
    expect(await settings.forDocument('issuer', 'foreign', 'faculty')).toMatchObject({ facultyLogo: image, signature: undefined });
    await settings.save('issuer', 'school', ['certificados:emitir'], 'signature', null);
    expect((await settings.forDocument('issuer', 'school', 'faculty')).signature).toBeUndefined();
  });
});
