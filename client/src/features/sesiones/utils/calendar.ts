// Utilidades de calendario en JS nativo (sin librería de fechas): el
// proyecto no usa ninguna, y este cálculo de rejillas no la necesita.

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

// Lunes como inicio de semana.
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;
  const start = addDays(date, diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

// 42 días (6 semanas) cubriendo el mes completo, empezando el lunes de la
// semana que contiene el día 1.
export function getMonthGridDays(cursor: Date): Date[] {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function getWeekDays(cursor: Date): Date[] {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const MONTH_LABEL = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
const DAY_SHORT = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });

export function formatMonthLabel(date: Date): string {
  const label = MONTH_LABEL.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekLabel(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  return `${DAY_SHORT.format(first)} – ${DAY_SHORT.format(last)}`;
}
