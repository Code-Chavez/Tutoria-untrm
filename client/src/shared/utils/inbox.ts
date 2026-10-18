/** Texto en minúsculas y sin tildes, para buscar sin que importen mayúsculas ni acentos. */
export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** ¿Alguno de los campos contiene lo buscado? Una búsqueda vacía lo acepta todo. */
export const matchesSearch = (search: string, fields: (string | null | undefined)[]): boolean => {
  const needle = normalizeText(search);
  if (!needle) return true;
  return fields.some((field) => field && normalizeText(field).includes(needle));
};

/** «hoy», «hace 1 día», «hace 9 días»: cuánto lleva esperando algo. Es información, no un plazo: los plazos los acuerda la DBU. */
export const waitingText = (since: string | Date, now: Date = new Date()): string => {
  const days = Math.floor((now.getTime() - new Date(since).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
};

/** Valor de un parámetro de la dirección (?estado=…) si es uno de los conocidos; si no, el valor por defecto. */
export function parseFilterParam<T extends string>(value: string | null, known: readonly T[], fallback: T): T {
  return known.includes(value as T) ? (value as T) : fallback;
}
