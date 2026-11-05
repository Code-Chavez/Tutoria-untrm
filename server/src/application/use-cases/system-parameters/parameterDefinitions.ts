// Parámetros del sistema que el DBU puede ajustar (HU-49). Solo se listan los
// que el sistema realmente consulta; esta lista es la fuente autoritativa de
// sus rangos y valores predeterminados (también los de seguridad de acceso, A08).
export interface ParameterDefinition {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  /** Valor que usa el sistema cuando el parámetro no está configurado. */
  defaultValue: number;
  group: 'Sesiones' | 'Alertas y plazos' | 'Seguridad de acceso';
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
  {
    key: 'inactivity_timeout_minutes',
    label: 'Cierre de sesión por inactividad',
    description: 'Minutos sin actividad tras los cuales se cierra la sesión (RF-07). Rige desde el siguiente inicio de sesión de cada persona.',
    unit: 'minutos',
    min: 5,
    max: 120,
    defaultValue: 15,
    group: 'Seguridad de acceso',
  },
  {
    key: 'login_max_attempts',
    label: 'Intentos fallidos antes del bloqueo',
    description: 'Contraseñas incorrectas seguidas que bloquean temporalmente la cuenta.',
    unit: 'intentos',
    min: 3,
    max: 10,
    defaultValue: 5,
    group: 'Seguridad de acceso',
  },
  {
    key: 'login_lockout_minutes',
    label: 'Duración del bloqueo de la cuenta',
    description: 'Minutos que la cuenta queda bloqueada tras superar los intentos fallidos.',
    unit: 'minutos',
    min: 1,
    max: 120,
    defaultValue: 15,
    group: 'Seguridad de acceso',
  },
  {
    key: 'tutor_max_weekly_hours',
    label: 'Máximo de horas de atención por semana',
    description: 'Tope de horas semanales de atención que un docente tutor puede ofrecer al aceptar su ciclo (la sesión dura 45 minutos; cada docente decide cuándo, cuánto y dónde).',
    unit: 'horas',
    min: 1,
    max: 40,
    defaultValue: 10,
    group: 'Sesiones',
  },
];

export const findParameterDefinition = (key: string): ParameterDefinition | undefined =>
  PARAMETER_DEFINITIONS.find((d) => d.key === key);
