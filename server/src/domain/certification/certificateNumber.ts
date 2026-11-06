/**
 * Número de registro del certificado del docente tutor.
 *
 * Mientras no exista el formato oficial (Q25, pendiente de la institución) solo se forma el número de DEMOSTRACIÓN, con el
 * prefijo `DEMO-` y su propia secuencia, de modo que nunca se confunda con uno válido. La forma sigue la del ejemplo que la
 * escuela entregó: `NNN-AAAA/UNTRM/{siglas facultad}-{siglas escuela}`. La base de datos impone que `is_demo` y el prefijo
 * coincidan (restricción `certificates_number_demo_prefix_check`).
 */
export const DEMO_PREFIX = 'DEMO-';
/** Ámbito del contador de demostración: independiente de cualquier numeración oficial. */
export const DEMO_SEQUENCE_SCOPE = 'DEMO';

const ACRONYM = /^[A-Z0-9]{2,12}$/;

export function formatDemoCertificateNumber(sequence: number, year: number, facultyAcronym: string, schoolAcronym: string): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError('La secuencia del certificado debe ser un entero positivo.');
  if (!Number.isInteger(year) || year < 2000 || year > 2999) throw new RangeError('El año del certificado no es válido.');
  const faculty = facultyAcronym.trim().toUpperCase();
  const school = schoolAcronym.trim().toUpperCase();
  if (!ACRONYM.test(faculty) || !ACRONYM.test(school)) throw new RangeError('Las siglas de facultad y escuela deben tener de 2 a 12 letras o dígitos.');
  return `${DEMO_PREFIX}${String(sequence).padStart(3, '0')}-${year}/UNTRM/${faculty}-${school}`;
}

export const isDemoCertificateNumber = (number: string): boolean => number.startsWith(DEMO_PREFIX);
