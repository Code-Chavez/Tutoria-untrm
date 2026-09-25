export class FollowUpInstructorDetailsRequiredError extends Error {
  constructor() {
    super(
      'Debe indicar el nombre del docente, el curso y el ciclo cuando el acuerdo es con un docente de asignatura',
    );
    this.name = 'FollowUpInstructorDetailsRequiredError';
  }
}
