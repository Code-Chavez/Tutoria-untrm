export class InterviewMotiveRequiredError extends Error {
  constructor() {
    super('Debe marcar al menos un motivo de la entrevista (académico, personal-emocional o vocacional-profesional)');
    this.name = 'InterviewMotiveRequiredError';
  }
}
