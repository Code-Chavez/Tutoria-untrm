export class InstructorDetailsRequiredError extends Error {
  constructor() {
    super('Debe indicar el nombre del docente y el curso cuando la solicitud proviene de un docente de asignatura');
    this.name = 'InstructorDetailsRequiredError';
  }
}

export class NoRoutingTargetError extends Error {
  constructor() {
    super('No se encontró un tutor ni un coordinador disponible para enrutar la solicitud');
    this.name = 'NoRoutingTargetError';
  }
}

export class StudentProfileNotLinkedError extends Error {
  constructor() {
    super('Tu cuenta aún no está vinculada a tu registro de estudiante. Contacta a Bienestar Universitario.');
    this.name = 'StudentProfileNotLinkedError';
  }
}
