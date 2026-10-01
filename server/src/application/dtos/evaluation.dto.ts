import { EvaluationScaleCode } from '@domain/entities/TutorEvaluation';

export interface SubmitEvaluationInput {
  // 20 respuestas, en el mismo orden de EVALUATION_ITEMS.
  scores: EvaluationScaleCode[];
  likes?: string;
  dislikes?: string;
}

export interface EvaluationStatus {
  // false si no hay periodo habilitado (HU-38) o el tutorado no tiene tutor.
  canRespond: boolean;
  alreadyResponded: boolean;
  periodName: string | null;
}

// Resultados agregados de un tutor (HU-37): nunca incluye studentId ni
// ningún otro dato que permita asociar una respuesta a un tutorado.
export interface EvaluationItemResult {
  code: string;
  label: string;
  // Promedio 1 (Nunca) a 5 (Siempre); null si no hay respuestas.
  average: number | null;
  distribution: Record<EvaluationScaleCode, number>;
}

export interface TutorEvaluationResults {
  tutorId: string;
  tutorName: string;
  periodName: string;
  totalResponses: number;
  overallAverage: number | null;
  items: EvaluationItemResult[];
}

// Configuración de apertura/cierre por escuela (HU-38, Art. 17.d).
export interface EvaluationWindowSchoolState {
  schoolId: string;
  schoolName: string;
  isOpen: boolean;
}

export interface EvaluationWindowsOverview {
  periodName: string;
  schools: EvaluationWindowSchoolState[];
}

// Estadísticas de evaluación por tutor (HU-39): promedios por ítem y por
// tutor, filtrables por escuela/facultad. Solo incluye tutores con al menos
// una respuesta — nunca expone al tutorado que respondió.
export interface EvaluationStatisticsItemAverage {
  code: string;
  label: string;
  average: number;
}

export interface EvaluationStatisticsTutorRow {
  tutorId: string;
  tutorName: string;
  totalResponses: number;
  overallAverage: number;
  items: EvaluationStatisticsItemAverage[];
}

export interface EvaluationStatisticsReport {
  periodName: string;
  tutors: EvaluationStatisticsTutorRow[];
}
