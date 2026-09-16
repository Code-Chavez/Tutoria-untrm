export class TutorNotFoundError extends Error {
  constructor() {
    super('El tutor seleccionado no existe o no es un Docente Tutor activo');
    this.name = 'TutorNotFoundError';
  }
}

export class NoStudentsSelectedError extends Error {
  constructor() {
    super('Debe seleccionar al menos un estudiante para asignar');
    this.name = 'NoStudentsSelectedError';
  }
}

export class ReassignReasonRequiredError extends Error {
  constructor() {
    super('Debe indicar el motivo de la reasignación');
    this.name = 'ReassignReasonRequiredError';
  }
}

export class SameTutorAssignmentError extends Error {
  constructor() {
    super('El estudiante ya está asignado a ese tutor');
    this.name = 'SameTutorAssignmentError';
  }
}
