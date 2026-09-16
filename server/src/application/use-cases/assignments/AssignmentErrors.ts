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
