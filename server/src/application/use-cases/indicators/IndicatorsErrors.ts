export class IndicatorsForbiddenError extends Error {
  constructor() {
    super('No autorizado para consultar los indicadores');
    this.name = 'IndicatorsForbiddenError';
  }
}
