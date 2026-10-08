export class SignedDocumentNotFoundError extends Error {
  constructor() {
    super('No se encontró el documento firmado');
    this.name = 'SignedDocumentNotFoundError';
  }
}

export class SignedDocumentForbiddenError extends Error {
  constructor() {
    super('No tienes permiso para adjuntar documentos firmados en este caso');
    this.name = 'SignedDocumentForbiddenError';
  }
}

export class AttendanceSheetPeriodNotFoundError extends Error {
  constructor() {
    super('No hay un periodo académico para la hoja de asistencia');
    this.name = 'AttendanceSheetPeriodNotFoundError';
  }
}
