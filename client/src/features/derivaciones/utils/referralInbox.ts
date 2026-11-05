import type { ReferralStatus, StudentReferral } from '../services/referralService';
import { REFERRAL_SERVICE_LABEL } from '../services/referralService';
import { matchesSearch } from '@shared/utils/inbox';

// Vistas de la bandeja de derivaciones: lo que está por recibir o en trámite va primero y no se pierde entre casos cerrados (U09).
export const REFERRAL_FILTERS = ['pendientes', 'por-recibir', 'en-tramite', 'abiertas', 'atendidos', 'cerrados', 'todos'] as const;
export type ReferralFilter = (typeof REFERRAL_FILTERS)[number];
export const DEFAULT_REFERRAL_FILTER: ReferralFilter = 'pendientes';

export const REFERRAL_FILTER_LABEL: Record<ReferralFilter, string> = {
  pendientes: 'Pendientes',
  'por-recibir': 'Por recibir',
  'en-tramite': 'En trámite',
  abiertas: 'Abiertas',
  atendidos: 'Atendidos',
  cerrados: 'Cerrados',
  todos: 'Todos',
};

const STATUSES_OF: Record<ReferralFilter, readonly ReferralStatus[]> = {
  pendientes: ['ENVIADO', 'RECIBIDO', 'EN_ATENCION'],
  'por-recibir': ['ENVIADO'],
  'en-tramite': ['RECIBIDO', 'EN_ATENCION'],
  abiertas: ['ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'ATENDIDO'],
  atendidos: ['ATENDIDO'],
  cerrados: ['CERRADO'],
  todos: ['ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'ATENDIDO', 'CERRADO'],
};

const PRIORITY: Record<ReferralStatus, number> = { ENVIADO: 0, RECIBIDO: 1, EN_ATENCION: 2, ATENDIDO: 3, CERRADO: 4 };

/** Un caso aún no cerrado ni atendido: lo que el servicio tiene por hacer. */
export const isPendingReferral = (r: Pick<StudentReferral, 'status'>): boolean => STATUSES_OF.pendientes.includes(r.status);

export function countReferrals(all: StudentReferral[]): Record<ReferralFilter, number> {
  const counts = {} as Record<ReferralFilter, number>;
  for (const filter of REFERRAL_FILTERS) counts[filter] = all.filter((r) => STATUSES_OF[filter].includes(r.status)).length;
  return counts;
}

/**
 * Las derivaciones de una vista, buscadas y ordenadas: primero las que faltan por recibir, luego las en trámite, y así
 * hasta las cerradas; dentro de cada estado, las pendientes de la más antigua a la más reciente y las ya atendidas o
 * cerradas de la más reciente a la más antigua.
 */
export function viewReferrals(all: StudentReferral[], filter: ReferralFilter, search: string): StudentReferral[] {
  return all
    .filter((r) => STATUSES_OF[filter].includes(r.status))
    .filter((r) => matchesSearch(search, [r.studentName, r.studentCode, REFERRAL_SERVICE_LABEL[r.service], r.receivingInstance]))
    .sort((a, b) => {
      if (PRIORITY[a.status] !== PRIORITY[b.status]) return PRIORITY[a.status] - PRIORITY[b.status];
      const byDate = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return PRIORITY[a.status] >= PRIORITY.ATENDIDO ? -byDate : byDate;
    });
}
