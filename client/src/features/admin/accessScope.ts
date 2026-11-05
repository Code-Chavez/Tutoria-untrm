import { REFERRAL_SERVICE_LABEL, type ReferralService } from '@features/derivaciones/services/referralService';
import type { AccessKind } from './services/userService';

export interface ScopeDraft {
  kind: AccessKind;
  schoolIds: string[];
  facultyIds: string[];
  service: string;
}

/** Frase que dice, con lo elegido, hasta dónde llega la persona. */
export function describeScope(draft: ScopeDraft, schools: { id: string; name: string }[], faculties: { id: string; name: string }[]): string {
  const names = (ids: string[], list: { id: string; name: string }[]) => ids.map((id) => list.find((x) => x.id === id)?.name ?? '—').join(', ');
  switch (draft.kind) {
    case 'NONE':
      return 'No ve datos de tutorados.';
    case 'OWN':
      return 'Solo ve a los tutorados que tiene asignados.';
    case 'SCHOOLS':
      return draft.schoolIds.length ? `Ve a los tutorados de: ${names(draft.schoolIds, schools)}.` : 'Elija al menos una escuela.';
    case 'FACULTIES':
      return draft.facultyIds.length ? `Ve a los tutorados de todas las escuelas de: ${names(draft.facultyIds, faculties)}.` : 'Elija al menos una facultad.';
    case 'INSTITUTION':
      return 'Ve a los tutorados de toda la institución.';
    case 'SERVICE':
      return draft.service ? `Atiende las derivaciones de ${REFERRAL_SERVICE_LABEL[draft.service as ReferralService] ?? draft.service}; no ve expedientes individuales.` : 'Elija el servicio.';
  }
}

