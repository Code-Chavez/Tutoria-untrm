export interface ScheduleSessionInput {
  // HU-18: un solo estudiante. HU-19 extenderá esto a una lista para sesiones
  // grupales, reutilizando el mismo caso de uso y modelo de datos.
  studentId: string;
  topic: string;
  scheduledAt: string; // ISO datetime
}
