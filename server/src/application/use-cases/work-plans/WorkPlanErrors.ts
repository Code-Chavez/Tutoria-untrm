export class WorkPlanForbiddenError extends Error {
  constructor() {
    super('No autorizado para administrar el plan de trabajo de esta escuela');
    this.name = 'WorkPlanForbiddenError';
  }
}
