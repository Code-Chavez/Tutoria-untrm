import { describe, it, expect } from 'vitest';
import type { StudentReferral } from '../services/referralService';
import { countReferrals, viewReferrals } from './referralInbox';

const ref = (id: string, status: StudentReferral['status'], createdAt: string, over: Partial<StudentReferral> = {}): StudentReferral =>
  ({ id, status, createdAt, service: 'PSICOLOGIA', receivingInstance: null, studentName: `Estudiante ${id}`, studentCode: `20190${id}`, ...over }) as StudentReferral;

// El caso real: un solo enviado y seis cerrados, que antes aparecían primero
const ALL = [
  ref('1', 'CERRADO', '2026-10-01T10:00:00Z'),
  ref('2', 'CERRADO', '2026-10-02T10:00:00Z'),
  ref('3', 'CERRADO', '2026-10-03T10:00:00Z'),
  ref('4', 'ATENDIDO', '2026-10-04T10:00:00Z'),
  ref('5', 'EN_ATENCION', '2026-10-05T10:00:00Z'),
  ref('6', 'ENVIADO', '2026-10-06T10:00:00Z'),
  ref('7', 'RECIBIDO', '2026-10-07T10:00:00Z'),
];

describe('bandeja de derivaciones: vistas (U09)', () => {
  it('«Por recibir» muestra solo lo enviado: el contador y la bandeja coinciden', () => {
    expect(viewReferrals(ALL, 'por-recibir', '').map((r) => r.id)).toEqual(['6']);
    expect(countReferrals(ALL)['por-recibir']).toBe(1);
  });

  it('«Pendientes» (la vista por defecto) pone lo enviado primero y deja fuera atendidos y cerrados', () => {
    expect(viewReferrals(ALL, 'pendientes', '').map((r) => r.id)).toEqual(['6', '7', '5']);
  });

  it('«En trámite» junta recibidos y en atención; «Abiertas» todo lo no cerrado', () => {
    expect(viewReferrals(ALL, 'en-tramite', '').map((r) => r.id)).toEqual(['7', '5']);
    expect(viewReferrals(ALL, 'abiertas', '').map((r) => r.id)).toEqual(['6', '7', '5', '4']);
  });

  it('«Todos» deja los cerrados al final, el más reciente primero entre ellos', () => {
    expect(viewReferrals(ALL, 'todos', '').map((r) => r.id)).toEqual(['6', '7', '5', '4', '3', '2', '1']);
  });

  it('busca por estudiante, código, servicio o instancia', () => {
    const list = [ref('8', 'ENVIADO', '2026-10-08T10:00:00Z', { receivingInstance: 'Lic. Quispe', studentName: 'Ana Núñez' }), ...ALL];
    expect(viewReferrals(list, 'pendientes', 'nunez').map((r) => r.id)).toEqual(['8']);
    expect(viewReferrals(list, 'pendientes', 'quispe').map((r) => r.id)).toEqual(['8']);
    expect(viewReferrals(list, 'pendientes', 'psicolog').length).toBe(4);
  });

  it('cuenta cada vista', () => {
    expect(countReferrals(ALL)).toEqual({ pendientes: 3, 'por-recibir': 1, 'en-tramite': 2, abiertas: 4, atendidos: 1, cerrados: 3, todos: 7 });
  });
});
