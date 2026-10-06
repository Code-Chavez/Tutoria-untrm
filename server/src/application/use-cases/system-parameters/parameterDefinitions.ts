// Parámetros del sistema que el DBU puede ajustar (HU-49). Solo se listan los
// que el sistema realmente consulta: los demás valores sembrados (p. ej. los
// de bloqueo de sesión) aún no se leen desde la base y no se exponen.
export interface ParameterDefinition {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  /** Valor que usa el sistema cuando el parámetro no está configurado. */
  defaultValue: number;
  group: 'Sesiones' | 'Alertas y plazos';
}

export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  {
    key: 'session_duration_minutes',
    label: 'Duración de la sesión',
    description: 'Duración de cada sesión de tutoría al programarla (Art. 15.c: 45 minutos).',
    unit: 'minutos',
    min: 15,
    max: 180,
    defaultValue: 45,
    group: 'Sesiones',
  },
  {
    key: 'max_sessions_per_semester',
    label: 'Número de sesiones por semestre',
    description: 'Filas de la ficha de asistencia individual por tutorado (Anexo N°4: 8).',
    unit: 'sesiones',
    min: 1,
    max: 30,
    defaultValue: 8,
    group: 'Sesiones',
  },
  {
    key: 'absence_alert_threshold',
    label: 'Umbral de alerta por inasistencias',
    description: 'Sesiones individuales pasadas sin asistencia confirmada a partir de las cuales se alerta al tutor.',
    unit: 'sesiones',
    min: 1,
    max: 10,
    defaultValue: 2,
    group: 'Alertas y plazos',
  },
  {
    key: 'referral_followup_deadline_hours',
    label: 'Plazo de atención de derivaciones',
    description: 'Horas sin movimiento tras las que una derivación se considera vencida (Art. 22.b).',
    unit: 'horas',
    min: 1,
    max: 720,
    defaultValue: 48,
    group: 'Alertas y plazos',
  },
];

export const findParameterDefinition = (key: string): ParameterDefinition | undefined =>
  PARAMETER_DEFINITIONS.find((d) => d.key === key);
