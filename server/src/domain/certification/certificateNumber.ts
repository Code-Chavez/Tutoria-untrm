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

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'para', 'a']);

/**
 * Siglas de DEMOSTRACIÓN para el número: iniciales de las palabras significativas del nombre («Facultad de Ingeniería de Sistemas y
 * Mecánica Eléctrica» → FISME). Las siglas oficiales no están guardadas todavía (Q25); cuando se decidan se persistirán y esta
 * derivación solo servirá para los certificados de demostración.
 */
export function deriveAcronym(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w.toLowerCase()));
  let acronym = words.map((w) => w[0]!.toUpperCase()).join('');
  if (acronym.length < 2) acronym = (words.join('') + 'XX').slice(0, 3).toUpperCase();
  return acronym.slice(0, 12);
}

export const isDemoCertificateNumber = (number: string): boolean => number.startsWith(DEMO_PREFIX);
