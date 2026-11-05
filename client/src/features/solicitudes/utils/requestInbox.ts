import type { TutoringRequestStatus, TutoringRequestView } from '../services/tutoringRequestService';
import { matchesSearch } from '@shared/utils/inbox';

// Vistas de la bandeja de solicitudes: lo que espera respuesta va primero y se ve sin recorrer lo ya atendido (U04).
export const REQUEST_FILTERS = ['por-atender', 'pendientes', 'en-atencion', 'atendidas', 'todas'] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];
export const DEFAULT_REQUEST_FILTER: RequestFilter = 'por-atender';

export const REQUEST_FILTER_LABEL: Record<RequestFilter, string> = {
  'por-atender': 'Por atender',
  pendientes: 'Pendientes',
  'en-atencion': 'En atención',
  atendidas: 'Atendidas',
  todas: 'Todas',
};

const STATUSES_OF: Record<RequestFilter, readonly TutoringRequestStatus[]> = {
  'por-atender': ['PENDIENTE', 'EN_ATENCION'],
  pendientes: ['PENDIENTE'],
  'en-atencion': ['EN_ATENCION'],
  atendidas: ['ATENDIDA'],
  todas: ['PENDIENTE', 'EN_ATENCION', 'ATENDIDA'],
};

// Orden de trabajo: pendientes, luego en atención, luego atendidas.
const PRIORITY: Record<TutoringRequestStatus, number> = { PENDIENTE: 0, EN_ATENCION: 1, ATENDIDA: 2 };

export const isOpenRequest = (r: Pick<TutoringRequestView, 'status'>): boolean => r.status !== 'ATENDIDA';

export function countRequests(all: TutoringRequestView[]): Record<RequestFilter, number> {
  const counts = {} as Record<RequestFilter, number>;
  for (const filter of REQUEST_FILTERS) counts[filter] = all.filter((r) => STATUSES_OF[filter].includes(r.status)).length;
  return counts;
}

/**
 * Las solicitudes de una vista, buscadas y ordenadas: las que esperan, de la más antigua a la más reciente (la que más
 * lleva esperando, primero); las ya atendidas, de la más reciente a la más antigua.
 */
export function viewRequests(all: TutoringRequestView[], filter: RequestFilter, search: string): TutoringRequestView[] {
  return all
    .filter((r) => STATUSES_OF[filter].includes(r.status))
    .filter((r) => matchesSearch(search, [r.studentName, r.studentCode, r.reason, r.instructorName, r.courseName]))
    .sort((a, b) => {
      if (PRIORITY[a.status] !== PRIORITY[b.status]) return PRIORITY[a.status] - PRIORITY[b.status];
      const byDate = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.status === 'ATENDIDA' ? -byDate : byDate;
    });
}
