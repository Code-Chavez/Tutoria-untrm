import { describe, it, expect } from 'vitest';
import type { TutoringRequestView } from '../services/tutoringRequestService';
import { countRequests, viewRequests } from './requestInbox';

const req = (id: string, status: TutoringRequestView['status'], createdAt: string, over: Partial<TutoringRequestView> = {}): TutoringRequestView =>
  ({ id, status, createdAt, studentName: `Estudiante ${id}`, studentCode: `20190${id}`, reason: 'Necesito apoyo', ...over }) as TutoringRequestView;

// Una pendiente antigua entre varias atendidas recientes: el caso de la revisión de uso real
const ALL = [
  req('1', 'ATENDIDA', '2026-10-15T10:00:00Z'),
  req('2', 'ATENDIDA', '2026-10-16T10:00:00Z'),
  req('3', 'PENDIENTE', '2026-09-20T10:00:00Z'),
  req('4', 'EN_ATENCION', '2026-10-01T10:00:00Z'),
  req('5', 'PENDIENTE', '2026-10-10T10:00:00Z'),
];

describe('bandeja de solicitudes: vistas (U04)', () => {
  it('«Por atender» muestra lo que espera, la que más lleva esperando primero, sin las ya atendidas', () => {
    expect(viewRequests(ALL, 'por-atender', '').map((r) => r.id)).toEqual(['3', '5', '4']);
  });

  it('cada vista muestra solo sus estados', () => {
    expect(viewRequests(ALL, 'pendientes', '').map((r) => r.id)).toEqual(['3', '5']);
    expect(viewRequests(ALL, 'en-atencion', '').map((r) => r.id)).toEqual(['4']);
    expect(viewRequests(ALL, 'atendidas', '').map((r) => r.id)).toEqual(['2', '1']); // la atendida más reciente, primero
  });

  it('«Todas» pone lo pendiente antes que lo atendido', () => {
    expect(viewRequests(ALL, 'todas', '').map((r) => r.id)).toEqual(['3', '5', '4', '2', '1']);
  });

  it('busca por estudiante, código, motivo o docente que la pidió, sin tildes', () => {
    const list = [req('6', 'PENDIENTE', '2026-10-01T10:00:00Z', { reason: 'Dificultad en Álgebra', instructorName: 'Prof. Núñez' }), ...ALL];
    expect(viewRequests(list, 'por-atender', 'algebra').map((r) => r.id)).toEqual(['6']);
    expect(viewRequests(list, 'por-atender', 'nunez').map((r) => r.id)).toEqual(['6']);
    expect(viewRequests(list, 'por-atender', '201905').map((r) => r.id)).toEqual(['5']);
  });

  it('cuenta cada vista para mostrarlo en los botones', () => {
    expect(countRequests(ALL)).toEqual({ 'por-atender': 3, pendientes: 2, 'en-atencion': 1, atendidas: 2, todas: 5 });
  });
});
