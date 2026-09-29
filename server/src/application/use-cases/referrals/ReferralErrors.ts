export class ReferralNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la derivación con ID ${id}`);
    this.name = 'ReferralNotFoundError';
  }
}

export class ReferralClosedError extends Error {
  constructor() {
    super('No se puede modificar una derivación que ya ha sido CERRADA');
    this.name = 'ReferralClosedError';
  }
}

export class ClosureNotesRequiredError extends Error {
  constructor() {
    super('Es obligatorio registrar las observaciones o notas para atender o cerrar el caso');
    this.name = 'ClosureNotesRequiredError';
  }
}

export class InvalidReferralStatusError extends Error {
  constructor(status: string) {
    super(`Estado '${status}' no es válido`);
    this.name = 'InvalidReferralStatusError';
  }
}

// Visibilidad restringida del caso (HU-30): un rol que no debe ver esta
// derivación (tutor que no la emitió, profesional de otro servicio, etc.).
export class ReferralForbiddenError extends Error {
  constructor() {
    super('No autorizado para ver esta derivación');
    this.name = 'ReferralForbiddenError';
  }
}

