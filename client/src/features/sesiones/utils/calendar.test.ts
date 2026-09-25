import { describe, it, expect } from 'vitest';
import {
  isSameDay,
  addDays,
  startOfWeek,
  addMonths,
  getMonthGridDays,
  getWeekDays,
} from './calendar';

describe('calendar utils', () => {
  it('isSameDay compara solo año/mes/día', () => {
    expect(isSameDay(new Date('2026-10-05T08:00:00'), new Date('2026-10-05T22:00:00'))).toBe(true);
    expect(isSameDay(new Date('2026-10-05'), new Date('2026-10-06'))).toBe(false);
  });

  it('addDays suma/resta días respetando el cambio de mes', () => {
    expect(addDays(new Date(2026, 9, 31), 1).getMonth()).toBe(10); // octubre -> noviembre
  });

  it('startOfWeek siempre cae en lunes', () => {
    // 2026-10-08 es jueves
    const monday = startOfWeek(new Date(2026, 9, 8));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(5);
  });

  it('startOfWeek retrocede correctamente cuando el día es domingo', () => {
    // 2026-10-11 es domingo
    const monday = startOfWeek(new Date(2026, 9, 11));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(5);
  });

  it('addMonths respeta el año al cruzar diciembre', () => {
    const next = addMonths(new Date(2026, 11, 15), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });

  it('getMonthGridDays devuelve 42 días empezando en lunes', () => {
    const days = getMonthGridDays(new Date(2026, 9, 15));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    // El grid debe incluir todos los días de octubre 2026.
    const inMonth = days.filter((d) => d.getMonth() === 9);
    expect(inMonth).toHaveLength(31);
  });

  it('getWeekDays devuelve 7 días de lunes a domingo', () => {
    const days = getWeekDays(new Date(2026, 9, 8));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });
});
