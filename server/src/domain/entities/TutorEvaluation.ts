// Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7).
export const EVALUATION_SCALE = ['N', 'CN', 'AV', 'CS', 'S'] as const;
export type EvaluationScaleCode = (typeof EVALUATION_SCALE)[number];

export interface EvaluationItem {
  code: string;
  label: string;
}

// Los 20 ítems del Anexo N°7, en el mismo orden del formato impreso.
export const EVALUATION_ITEMS: readonly EvaluationItem[] = [
  { code: '01', label: 'Demuestra una actitud positiva y está dispuesto a ayudarte.' },
  {
    code: '02',
    label:
      'Con su amabilidad y habilidad, logra generar un ambiente de confianza que te permite compartir tus problemas.',
  },
  { code: '03', label: 'Te brinda un trato respetuoso y atento.' },
  {
    code: '04',
    label:
      'Demuestra preocupación por las dificultades académicas y personales que pueden estar influyendo en tu desempeño.',
  },
  { code: '05', label: 'Demuestra habilidad para prestar atención a tus dificultades.' },
  { code: '06', label: 'Demuestra la voluntad de mantener un diálogo constante contigo.' },
  { code: '07', label: 'Posee la habilidad para aclarar tus interrogantes académicas.' },
  { code: '08', label: 'Demuestra interés en guiarte en métodos y estrategias de aprendizaje.' },
  {
    code: '09',
    label:
      'Demuestra interés en identificar tus desafíos más significativos y tomar las medidas necesarias para solucionarlos.',
  },
  { code: '10', label: 'Demostró interés en fomentar tu aprendizaje autónomo.' },
  { code: '11', label: 'Tiene una formación académica adecuada en tu campo de estudio.' },
  {
    code: '12',
    label:
      'Tiene un sólido conocimiento de las técnicas pedagógicas para la atención personalizada o grupal, según corresponda.',
  },
  { code: '13', label: 'Es fácil localizar al tutor que tienes asignado.' },
  {
    code: '14',
    label:
      'Tiene un buen conocimiento de las reglas institucionales para poder aconsejarte sobre las opciones que mejor se adaptan a tus intereses o dificultades académicas.',
  },
  {
    code: '15',
    label:
      'La guía proporcionada por el tutor te ha facilitado hacer una elección apropiada de asignaturas y créditos de acuerdo a tu programa de estudios.',
  },
  {
    code: '16',
    label: 'Te deriva a las áreas pertinentes cuando enfrentas un problema que supera su campo de competencia.',
  },
  {
    code: '17',
    label: 'Consideras que tu participación en el programa de tutoría ha mejorado tu desempeño académico.',
  },
  { code: '18', label: 'Tu integración a la universidad ha mejorado con el programa de tutoría.' },
  { code: '19', label: 'Consideras que el programa de tutoría es satisfactorio.' },
  { code: '20', label: 'Te sientes satisfecho con el tutor que te ha sido asignado.' },
];

export interface TutorEvaluation {
  id: string;
  studentId: string;
  tutorId: string;
  periodId: string;
  // Una respuesta por ítem, en el mismo orden de EVALUATION_ITEMS.
  scores: EvaluationScaleCode[];
  likes: string | null;
  dislikes: string | null;
  createdAt: Date;
}
