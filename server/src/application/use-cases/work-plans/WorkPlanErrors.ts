export class WorkPlanForbiddenError extends Error {
  constructor() {
    super('No autorizado para administrar el plan de trabajo de esta escuela');
    this.name = 'WorkPlanForbiddenError';
  }
}

export class WorkPlanNotFoundError extends Error {
  constructor() {
    super('La escuela aún no tiene un plan de trabajo en el periodo activo');
    this.name = 'WorkPlanNotFoundError';
  }
}

export class WorkPlanResolutionNotFoundError extends Error {
  constructor() {
    super('El plan de trabajo aún no tiene resolución de aprobación adjunta');
    this.name = 'WorkPlanResolutionNotFoundError';
  }
}

export class WorkPlanVersionNotFoundError extends Error {
  constructor() {
    super('No existe esa versión aprobada del plan de trabajo');
    this.name = 'WorkPlanVersionNotFoundError';
  }
}
