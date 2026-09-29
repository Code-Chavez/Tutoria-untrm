export class NoActivePeriodError extends Error {
  constructor() {
    super('No hay un periodo académico habilitado para la evaluación');
    this.name = 'NoActivePeriodError';
  }
}

export class EvaluationAlreadySubmittedError extends Error {
  constructor() {
    super('Ya respondiste el cuestionario de evaluación de este periodo');
    this.name = 'EvaluationAlreadySubmittedError';
  }
}

export class TutorNotAssignedError extends Error {
  constructor() {
    super('Aún no tienes un tutor asignado para evaluar');
    this.name = 'TutorNotAssignedError';
  }
}
