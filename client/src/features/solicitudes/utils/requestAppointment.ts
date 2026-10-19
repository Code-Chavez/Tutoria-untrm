import type { TutoringRequestView } from '../services/tutoringRequestService';

type Appointment = NonNullable<TutoringRequestView['appointment']>;

const WHEN = new Intl.DateTimeFormat('es-PE', { dateStyle: 'full', timeStyle: 'short' });

/**
 * La cita de una solicitud, dicha al estudiante: vigente, nueva (reemplazó a una cancelada) o cancelada y aún sin otra. Solo fecha,
 * modalidad y lugar —lo que ya ve en «Mis sesiones»—; nunca notas del tutor ni motivos internos. No promete plazos.
 */
export function appointmentSummary(appointment: Appointment): { tone: 'info' | 'warning'; label: string; text: string; next: string } {
  const when = WHEN.format(new Date(appointment.scheduledAt));
  const where = appointment.place ? ` · ${appointment.modality === 'VIRTUAL' ? 'Virtual' : 'Presencial'}: ${appointment.place}` : '';
  if (appointment.state === 'CANCELADA') {
    return {
      tone: 'warning',
      label: 'Cita cancelada',
      text: `La cita del ${when} se canceló y tu solicitud sigue abierta.`,
      next: 'Tu tutor puede programar otra: te avisaremos en el sistema. No hace falta pedirla de nuevo.',
    };
  }
  if (appointment.replacedSessionIds.length > 0) {
    return {
      tone: 'info',
      label: 'Nueva cita',
      text: `Tu cita anterior se canceló y se programó otra: ${when}${where}.`,
      next: 'Revísala en «Mis sesiones».',
    };
  }
  return { tone: 'info', label: 'Cita programada', text: `${when}${where}.`, next: 'Revísala en «Mis sesiones».' };
}
