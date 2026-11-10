/**
 * Contenido del certificado del docente tutor (corte 4). Aquí solo se COMPONE el texto, sin dibujar nada: así se prueba sin leer un
 * PDF y el generador (`CertificatePdfRenderer`) solo lo coloca en la página. La disposición sigue el ejemplo que la escuela entregó
 * (docs/levantamiento/17_DISENO_CERTIFICACION_DEMOSTRACION.md, §1).
 *
 * Todo lo que todavía no es dato institucional va como MARCADOR visible (logotipos, ciudad, autoridad firmante) y el documento lleva
 * la marca «DEMOSTRACIÓN — SIN VALOR»: un certificado de demostración no se puede confundir con uno válido.
 */
export const DEMO_WATERMARK = 'DEMOSTRACIÓN — SIN VALOR';
export const UNIVERSITY_NAME = 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas';

export const DEMO_TEMPLATE = {
  name: 'Demostración',
  version: 1,
  // «Certificado» o «Constancia» sigue pendiente de la institución: el título vive en la plantilla, no en el código del generador.
  title: 'CERTIFICADO',
  // Variables: {escuela}, {facultad}, {departamento}, {resolucion}, {periodo}.
  bodyText:
    'Docente adscrito al Departamento Académico de {departamento} de la {facultad}, como miembro de la {{Comisión de Tutoría de Estudiantes}} de la Escuela Profesional de {escuela}, aprobado con Resolución de Decanato N.° {resolucion}, a la fecha desempeñando su labor conforme a las actividades planificadas durante el semestre académico {periodo}.',
} as const;

/** Ciudad que se imprime en la fecha cuando la sede de la escuela no tiene una configurada. */
export const DEFAULT_CERTIFICATE_CITY = 'Chachapoyas';

export interface CertificatePrintData {
  title: string;
  /** Plantilla del cuerpo con variables; `{{…}}` marca el texto en negrita. */
  bodyTemplate: string;
  number: string;
  tutorName: string;
  schoolName: string;
  facultyName: string;
  /** Hoy no hay dato de departamento académico: en demostración se usa el nombre de la escuela y queda marcado en la instantánea. */
  department: string;
  periodName: string;
  resolutionNumber: string;
  /** Ciudad de la sede de la escuela. */
  city: string;
  /** Autoridad que firma, configurada por la escuela; sin nombre se imprime el marcador. */
  signatoryName?: string | null;
  signatoryRole?: string | null;
  issuedOn: Date;
}

export interface TextSegment {
  text: string;
  bold?: boolean;
}

export interface CertificateText {
  title: string;
  watermark: string;
  logoPlaceholders: { left: string; right: string };
  intro: string;
  name: string;
  body: TextSegment[];
  dateLine: string;
  signatory: string[];
  numberLine: string;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «04 agosto de 2025», como en el ejemplo de la escuela (UTC: la fecha no cambia según el huso del servidor). */
export function formatCertificateDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (match, key: string) => (key in values ? (values[key] as string) : match));
}

function segments(text: string): TextSegment[] {
  return text
    .split(/(\{\{.*?\}\})/)
    .filter((part) => part.length > 0)
    .map((part) => (part.startsWith('{{') ? { text: part.slice(2, -2), bold: true } : { text: part }));
}

export function composeCertificateText(data: CertificatePrintData): CertificateText {
  const values = {
    escuela: data.schoolName,
    facultad: data.facultyName,
    departamento: data.department,
    resolucion: data.resolutionNumber,
    periodo: data.periodName,
  };
  return {
    title: data.title,
    watermark: DEMO_WATERMARK,
    logoPlaceholders: { left: 'LOGO UNIVERSIDAD (marcador)', right: 'LOGO FACULTAD (marcador)' },
    intro: `El Director de la Escuela Profesional de ${data.schoolName} de la ${data.facultyName}, de la ${UNIVERSITY_NAME}. Extiende la presente constancia a:`,
    name: data.tutorName.toLocaleUpperCase('es-PE'),
    body: segments(fill(data.bodyTemplate, values)),
    dateLine: `${data.city}, ${formatCertificateDate(data.issuedOn)}.`,
    signatory: [data.signatoryName || '[Nombre y grado de la autoridad firmante]', data.signatoryRole || `Director de Escuela de ${data.schoolName}`, data.facultyName, UNIVERSITY_NAME],
    numberLine: `N.° REG. ${data.number}`,
  };
}
