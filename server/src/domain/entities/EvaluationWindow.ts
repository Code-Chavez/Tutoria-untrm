// Apertura/cierre de la evaluación de tutoría por periodo y escuela (HU-38,
// Art. 17.d).
export interface EvaluationWindow {
  id: string;
  periodId: string;
  schoolId: string;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}
