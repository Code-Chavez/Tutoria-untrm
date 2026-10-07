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


// Gestión del caso (HU-31/32): solo la DBU y el profesional del servicio destino
// pueden registrar recepción, atención o cierre.
export class ReferralStatusForbiddenError extends Error {
  constructor() {
    super('No autorizado para cambiar el estado de esta derivación');
    this.name = 'ReferralStatusForbiddenError';
  }
}

export class InvalidReferralTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`No se puede pasar de '${from}' a '${to}': el estado de una derivación solo avanza`);
    this.name = 'InvalidReferralTransitionError';
  }
}

// Otra petición cambió el estado mientras se procesaba esta (p. ej. un cierre simultáneo).
export class ReferralConflictError extends Error {
  constructor() {
    super('La derivación cambió de estado mientras la actualizabas. Vuelve a abrirla e inténtalo de nuevo');
    this.name = 'ReferralConflictError';
  }
}

// El listado de casos no está disponible para este rol o cuenta. Se responde con la
// razón (403) en vez de una bandeja vacía que parezca "no hay casos" (A15).
export class ReferralListNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralListNotAllowedError';
  }
}
