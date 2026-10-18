import type { SessionNotice } from '../services/sessionService';

/**
 * Qué se le dice a quien programó, reprogramó o canceló una sesión sobre los avisos (lo que de verdad hizo el sistema): a cuántos
 * tutorados avisó y, si hay quien no tiene cuenta del portal, que lo comunique por otro medio.
 */
export function sessionNoticeText(notice: SessionNotice | undefined): string {
  if (!notice) return '';
  const { notified, notReached } = notice;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  if (notReached === 0) return notified === 0 ? '' : ` Se avisó ${plural(notified, 'al estudiante', `a los ${notified} estudiantes`)} en el sistema.`;
  if (notified === 0) {
    return ` ${plural(notReached, 'El estudiante no tiene cuenta del portal', `Los ${notReached} estudiantes no tienen cuenta del portal`)}: el sistema no puede avisar. Comunícalo por otro medio.`;
  }
  return ` Se avisó a ${notified} en el sistema; ${notReached} no ${plural(notReached, 'tiene', 'tienen')} cuenta del portal: avísa${plural(notReached, 'le', 'les')} por otro medio.`;
}
