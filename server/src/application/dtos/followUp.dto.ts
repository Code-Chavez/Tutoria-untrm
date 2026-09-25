export interface CreateFollowUpInput {
  reason: string;
  agreements: string;
  // Si el acuerdo es con un docente de asignatura (no con el propio
  // tutorado), se exigen los tres juntos.
  withInstructor: boolean;
  instructorName?: string;
  courseName?: string;
  courseCycle?: number;
}
