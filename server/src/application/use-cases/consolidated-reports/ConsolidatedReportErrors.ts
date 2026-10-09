export class ConsolidatedReportForbiddenError extends Error {
  constructor() {
    super('No autorizado para consultar el informe consolidado');
    this.name = 'ConsolidatedReportForbiddenError';
  }
}
