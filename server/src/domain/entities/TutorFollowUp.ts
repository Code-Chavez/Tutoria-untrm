// Ficha de seguimiento (Anexo N° 5 del Protocolo, HU-24). Los datos de
// filiación ya presentes en Student no se duplican aquí; se obtienen uniendo
// por studentId (mismo criterio que TutorInterview).
export interface TutorFollowUp {
  id: string;
  studentId: string;
  conductedById: string;

  // II. Motivo de seguimiento
  reason: string;

  // III. Acuerdos tomados con los docentes o estudiante. Si el acuerdo es
  // con un docente de asignatura, instructorName/courseName/courseCycle
  // quedan informados; si es con el propio tutorado, quedan en null.
  agreements: string;
  instructorName?: string | null;
  courseName?: string | null;
  courseCycle?: number | null;

  createdAt: Date;
}
