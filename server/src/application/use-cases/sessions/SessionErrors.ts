export class TutorScheduleConflictError extends Error {
  constructor() {
    super('El tutor ya tiene una sesión programada que se solapa con este horario');
    this.name = 'TutorScheduleConflictError';
  }
}
