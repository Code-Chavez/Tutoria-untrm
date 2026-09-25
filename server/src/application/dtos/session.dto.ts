export interface ScheduleSessionInput {
  // Uno o más estudiantes: 1 = sesión individual (HU-18), 2+ = grupal (HU-19,
  // Art. 7.b). Mismo caso de uso y modelo de datos para ambos casos.
  studentIds: string[];
  topic: string;
  scheduledAt: string; // ISO datetime
}
