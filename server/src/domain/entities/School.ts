export interface School {
  id: string;
  name: string;
  facultyId: string;
  isActive: boolean;
  cycleCount?: number;
  coordinatorId?: string | null;
  /** Sede donde se dicta la escuela. */
  campusId?: string | null;
  /** Correo al que se piden las listas de estudiantes de la escuela. */
  requestEmail?: string | null;
  createdAt: Date;
}
