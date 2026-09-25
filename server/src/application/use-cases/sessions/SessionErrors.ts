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

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la sesión con ID ${id}`);
    this.name = 'SessionNotFoundError';
  }
}

export class NotSessionTutorError extends Error {
  constructor() {
    super('Solo el tutor de la sesión puede modificarla');
    this.name = 'NotSessionTutorError';
  }
}

export class GroupSessionAttendanceError extends Error {
  constructor() {
    super('El registro de asistencia (Anexo N° 4) es exclusivo de sesiones individuales');
    this.name = 'GroupSessionAttendanceError';
  }
}

export class SessionNotStartedError extends Error {
  constructor() {
    super('No se puede registrar la asistencia de una sesión que aún no comienza');
    this.name = 'SessionNotStartedError';
  }
}

export class AttendanceAlreadyRegisteredError extends Error {
  constructor() {
    super('Esta sesión ya tiene la asistencia registrada');
    this.name = 'AttendanceAlreadyRegisteredError';
  }
}

export class AttendanceLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Se alcanzó el máximo de ${limit} sesiones registradas para esta tutoría individual`);
    this.name = 'AttendanceLimitReachedError';
  }
}

export class ChangeReasonRequiredError extends Error {
  constructor() {
    super('Debe indicar el motivo del cambio');
    this.name = 'ChangeReasonRequiredError';
  }
}

export class SessionAlreadyCompletedError extends Error {
  constructor() {
    super('No se puede modificar una sesión que ya se realizó');
    this.name = 'SessionAlreadyCompletedError';
  }
}

export class SessionAlreadyCancelledError extends Error {
  constructor() {
    super('Esta sesión ya fue cancelada');
    this.name = 'SessionAlreadyCancelledError';
  }
}

export class SessionEvidenceNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la evidencia con ID ${id}`);
    this.name = 'SessionEvidenceNotFoundError';
  }
}
