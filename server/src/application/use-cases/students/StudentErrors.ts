export class DuplicateStudentCodeError extends Error {
  constructor(code: string) {
    super(`Ya existe un estudiante con el código ${code}`);
    this.name = 'DuplicateStudentCodeError';
  }
}

export class StudentNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el estudiante con ID ${id}`);
    this.name = 'StudentNotFoundError';
  }
}

export class SchoolNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la escuela con ID ${id}`);
    this.name = 'SchoolNotFoundError';
  }
}

export class RiskReasonRequiredError extends Error {
  constructor() {
    super('Debe indicar el motivo al marcar a un estudiante en riesgo académico');
    this.name = 'RiskReasonRequiredError';
  }
}

export class PortalUserNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el usuario con ID ${id}`);
    this.name = 'PortalUserNotFoundError';
  }
}

export class PortalUserRoleMismatchError extends Error {
  constructor() {
    super('Solo se puede vincular una cuenta con rol Tutorado');
    this.name = 'PortalUserRoleMismatchError';
  }
}

export class PortalUserAlreadyLinkedError extends Error {
  constructor() {
    super('Esa cuenta ya está vinculada al registro de otro estudiante');
    this.name = 'PortalUserAlreadyLinkedError';
  }
}
