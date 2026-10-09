// Informe de implementación de la tutoría semestral del tutor (HU-43,
// Anexo N°9 del Protocolo): datos generales + tutorías individuales y
// grupales (actividades, logros, dificultades, sugerencias, participantes).
export interface SemesterReportRow {
  activity: string;
  achievements: string;
  difficulties: string;
  suggestions: string;
  participants: number;
}

export interface TutorSemesterReportContent {
  programName: string;
  faculty: string;
  teacherCategory: string;
  tutoringCycles: string;
  phone: string;
  individual: SemesterReportRow[];
  group: SemesterReportRow[];
}

export interface TutorSemesterReport extends TutorSemesterReportContent {
  id: string;
  periodId: string;
  tutorId: string;
  createdAt: Date;
  updatedAt: Date;
}
