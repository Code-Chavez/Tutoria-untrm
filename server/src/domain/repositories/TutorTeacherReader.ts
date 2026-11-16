/** Un docente tutor activo tal como lo ve la lista de «Docentes tutores». */
export interface TutorTeacherRecord {
  id: string;
  firstName: string;
  lastName: string;
  /** Escuela a la que pertenece su cuenta; nula si no tiene. */
  schoolId: string | null;
}

/** Un ciclo que un docente atiende en el periodo, con el estado de su aceptación. */
export interface TutorAssignmentRecord {
  tutorId: string;
  schoolId: string;
  cycle: number;
  acceptanceStatus: string;
  acceptanceExpiresAt: Date | null;
}

/** Un trámite de certificación del docente en el periodo (solo lo necesario para mostrar su estado). */
export interface TutorCertificateRecord {
  id: string;
  tutorId: string;
  schoolId: string;
  status: string;
  createdAt: Date;
}

export interface TutorTeacherData {
  teachers: TutorTeacherRecord[];
  assignments: TutorAssignmentRecord[];
  certificates: TutorCertificateRecord[];
}

/**
 * Lectura para la lista de docentes tutores de un periodo. `schoolIds` es el alcance de quien consulta: sin él el alcance es total.
 * Con él, ni las designaciones ni los trámites de otras escuelas llegan a la respuesta, y solo entran los docentes cuya cuenta
 * pertenece a una de esas escuelas o que tienen una designación en ellas.
 */
export interface TutorTeacherReader {
  read(filters: { periodId: string; schoolIds?: string[] }): Promise<TutorTeacherData>;
}
