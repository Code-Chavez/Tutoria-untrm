export class SemesterReportNotFoundError extends Error {
  constructor() {
    super('Aún no guardaste el informe semestral de este periodo');
    this.name = 'SemesterReportNotFoundError';
  }
}
