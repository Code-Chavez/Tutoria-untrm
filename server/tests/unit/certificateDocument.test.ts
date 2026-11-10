import { DEMO_TEMPLATE, DEMO_WATERMARK, UNIVERSITY_NAME, composeCertificateText, formatCertificateDate } from '../../src/domain/certification/certificateDocument';
import { deriveAcronym, formatDemoCertificateNumber } from '../../src/domain/certification/certificateNumber';
import { DemoCertificatePdfRenderer } from '../../src/infrastructure/export/DemoCertificatePdfRenderer';

const data = {
  title: DEMO_TEMPLATE.title,
  bodyTemplate: DEMO_TEMPLATE.bodyText,
  number: 'DEMO-001-2026/UNTRM/FISME-IS',
  tutorName: 'Docente Ficticio Prueba',
  schoolName: 'Ingeniería de Sistemas',
  facultyName: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica',
  department: 'Ingeniería de Sistemas',
  periodName: '2026-II',
  resolutionNumber: '030-2026-DEMO',
  city: 'Chachapoyas',
  issuedOn: new Date('2026-11-05T15:30:00.000Z'),
};

describe('siglas de demostración para el número', () => {
  it.each([
    ['Facultad de Ingeniería de Sistemas y Mecánica Eléctrica', 'FISME'],
    ['Ingeniería de Sistemas', 'IS'],
    ['Facultad de Ciencias Económicas y Administrativas', 'FCEA'],
    ['Escuela de la Educación', 'EE'],
    ['Medicina', 'MED'],
    ['Ñoño   y  Ávila', 'NA'],
  ])('«%s» → %s', (name, acronym) => {
    expect(deriveAcronym(name)).toBe(acronym);
  });

  it('siempre cabe en un número de demostración válido', () => {
    for (const name of ['A', 'Medicina', 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica', 'x'.repeat(80), 'Uno Dos Tres Cuatro Cinco Seis Siete Ocho Nueve Diez Once Doce Trece Catorce']) {
      expect(() => formatDemoCertificateNumber(1, 2026, deriveAcronym(name), deriveAcronym(name))).not.toThrow();
    }
  });
});

describe('texto del certificado de demostración', () => {
  const text = composeCertificateText(data);

  it('lleva la marca de agua, el número y el título de la plantilla', () => {
    expect(text.watermark).toBe(DEMO_WATERMARK);
    expect(DEMO_WATERMARK).toMatch(/DEMOSTRACIÓN/);
    expect(text.numberLine).toBe('N.° REG. DEMO-001-2026/UNTRM/FISME-IS');
    expect(text.title).toBe('CERTIFICADO');
  });

  it('compone la introducción y el nombre del docente en mayúsculas', () => {
    expect(text.intro).toBe(`El Director de la Escuela Profesional de Ingeniería de Sistemas de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica, de la ${UNIVERSITY_NAME}. Extiende la presente constancia a:`);
    expect(text.name).toBe('DOCENTE FICTICIO PRUEBA');
  });

  it('sustituye todas las variables del cuerpo y deja en negrita la comisión', () => {
    const body = text.body.map((s) => s.text).join('');
    expect(body).toContain('Departamento Académico de Ingeniería de Sistemas');
    expect(body).toContain('Resolución de Decanato N.° 030-2026-DEMO');
    expect(body).toContain('semestre académico 2026-II');
    expect(body).not.toMatch(/[{}]/);
    expect(text.body.filter((s) => s.bold).map((s) => s.text)).toEqual(['Comisión de Tutoría de Estudiantes']);
  });

  it('imprime la ciudad indicada en la fecha, y usa marcadores, no datos oficiales, para los logotipos y la autoridad firmante', () => {
    expect(text.logoPlaceholders.left).toMatch(/marcador/);
    expect(text.logoPlaceholders.right).toMatch(/marcador/);
    expect(text.dateLine).toBe('Chachapoyas, 05 noviembre de 2026.');
    expect(composeCertificateText({ ...data, city: 'Bagua Grande' }).dateLine).toBe('Bagua Grande, 05 noviembre de 2026.');
    expect(text.signatory[0]).toMatch(/^\[.*autoridad firmante\]$/);
    const configured = composeCertificateText({ ...data, signatoryName: 'Dr. Ana Pérez Rojas', signatoryRole: 'Directora de la Escuela' });
    expect(configured.signatory.slice(0, 2)).toEqual(['Dr. Ana Pérez Rojas', 'Directora de la Escuela']);
    expect(text.signatory).toContain('Director de Escuela de Ingeniería de Sistemas');
  });

  it('una variable desconocida de la plantilla no se borra en silencio', () => {
    const odd = composeCertificateText({ ...data, bodyTemplate: 'Texto {desconocida} y {escuela}' });
    expect(odd.body.map((s) => s.text).join('')).toBe('Texto {desconocida} y Ingeniería de Sistemas');
  });

  it('la fecha se formatea en UTC, sin depender del huso del servidor', () => {
    expect(formatCertificateDate(new Date('2025-08-04T00:00:00.000Z'))).toBe('04 agosto de 2025');
    expect(formatCertificateDate(new Date('2026-01-31T23:59:59.000Z'))).toBe('31 enero de 2026');
  });
});

describe('PDF de demostración', () => {
  it('es una sola página A4 horizontal y un PDF bien formado', async () => {
    const buffer = await new DemoCertificatePdfRenderer().render(composeCertificateText(data));
    const raw = buffer.toString('latin1');
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(buffer.length).toBeGreaterThan(2_000);
    // Una sola página (el árbol «/Type /Pages» no cuenta).
    expect(raw.match(/\/Type \/Page(?!s)/g)).toHaveLength(1);
    expect(raw).toMatch(/\/MediaBox \[0 0 841\.89 595\.28\]/);
  });

  it('dos generaciones del mismo contenido son PDFs válidos independientes (la huella es de cada archivo)', async () => {
    const renderer = new DemoCertificatePdfRenderer();
    const [a, b] = await Promise.all([renderer.render(composeCertificateText(data)), renderer.render(composeCertificateText({ ...data, number: 'DEMO-002-2026/UNTRM/FISME-IS' }))]);
    expect(a.equals(b)).toBe(false);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});
