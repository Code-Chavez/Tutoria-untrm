export class ReportPeriodNotFoundError extends Error {
  constructor() {
    super('El semestre indicado no existe');
    this.name = 'ReportPeriodNotFoundError';
  }
}

export class ReportFiltersForbiddenError extends Error {
  constructor() {
    super('No autorizado para consultar los filtros de reportes');
    this.name = 'ReportFiltersForbiddenError';
  }
}
