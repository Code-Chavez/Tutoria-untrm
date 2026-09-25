export class TutorScheduleConflictError extends Error {
  constructor() {
    super('El tutor ya tiene una sesión programada que se solapa con este horario');
    this.name = 'TutorScheduleConflictError';
  }
}

export class LocationRequiredError extends Error {
  constructor() {
    super('Debe indicar el lugar de la sesión presencial (Art. 8.c)');
    this.name = 'LocationRequiredError';
  }
}

export class MeetingLinkRequiredError extends Error {
  constructor() {
    super('Debe indicar el enlace de videollamada de la sesión virtual (Art. 8.d)');
    this.name = 'MeetingLinkRequiredError';
  }
}
