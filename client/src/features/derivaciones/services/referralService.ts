import { apiClient } from '@shared/services/apiClient';

// Ficha de derivación (HU-28, Anexo N°6).
export type ReferralService = 'ESCUELA' | 'PSICOPEDAGOGIA' | 'PSICOLOGIA' | 'ASISTENCIA_SOCIAL' | 'SALUD';

export const REFERRAL_SERVICE_LABEL: Record<ReferralService, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Psicopedagogía',
  PSICOLOGIA: 'Psicología',
  ASISTENCIA_SOCIAL: 'Asistencia Social',
  SALUD: 'Salud',
};

export type ReferralAspectCode =
  | 'ACADEMIC_AT_RISK_OF_FAILING'
  | 'ACADEMIC_MISSING_ASSIGNMENTS'
  | 'ACADEMIC_UNEXPLAINED_ABSENCES'
  | 'ACADEMIC_DIFFICULTY_CONCENTRATING'
  | 'ACADEMIC_PRACTICAL_VS_WRITTEN_GAP'
  | 'ACADEMIC_DIFFICULTY_UNDERSTANDING'
  | 'SOCIAL_FREEZES_IN_PUBLIC'
  | 'SOCIAL_NO_GROUP_PARTICIPATION'
  | 'SOCIAL_IMPULSIVE'
  | 'SOCIAL_VERBALLY_AGGRESSIVE'
  | 'SOCIAL_CONFRONTS_AUTHORITY'
  | 'APPEARANCE_HAGGARD'
  | 'APPEARANCE_NEGLECTED'
  | 'MENTAL_HEALTH_ANXIOUS'
  | 'MENTAL_HEALTH_DEPRESSED_SAD'
  | 'MENTAL_HEALTH_UNCLEAR_SPEECH'
  | 'MENTAL_HEALTH_DEFENSIVE';

export interface ReferralAspectOption {
  code: ReferralAspectCode;
  category: string;
  label: string;
}

// Checklist "Aspectos a Observar" del Anexo N°6, en el mismo orden del formato impreso.
export const REFERRAL_ASPECTS: ReferralAspectOption[] = [
  { code: 'ACADEMIC_AT_RISK_OF_FAILING', category: 'Académicos', label: 'Está en riesgo de repetir algún curso' },
  { code: 'ACADEMIC_MISSING_ASSIGNMENTS', category: 'Académicos', label: 'Incumple o no entrega con frecuencia trabajos, encargos, etc.' },
  { code: 'ACADEMIC_UNEXPLAINED_ABSENCES', category: 'Académicos', label: 'Se ausenta u observa tardanza al ingresar al aula sin explicación o justificación en repetidas ocasiones' },
  { code: 'ACADEMIC_DIFFICULTY_CONCENTRATING', category: 'Académicos', label: 'Se observa dificultad para concentrarse en clases en reiteradas oportunidades' },
  { code: 'ACADEMIC_PRACTICAL_VS_WRITTEN_GAP', category: 'Académicos', label: 'Es muy bueno en lo práctico, pero tiene muy mal desempeño en exámenes escritos o viceversa' },
  { code: 'ACADEMIC_DIFFICULTY_UNDERSTANDING', category: 'Académicos', label: 'Tiene notoria dificultad para comprender instrucciones y explicaciones' },
  { code: 'SOCIAL_FREEZES_IN_PUBLIC', category: 'Sociales', label: 'Se paraliza o bloquea con frecuencia en exposiciones o frente al público' },
  { code: 'SOCIAL_NO_GROUP_PARTICIPATION', category: 'Sociales', label: 'No participa en los trabajos grupales durante clases' },
  { code: 'SOCIAL_IMPULSIVE', category: 'Sociales', label: 'Es impulsivo/a o muestra conductas desbordadas' },
  { code: 'SOCIAL_VERBALLY_AGGRESSIVE', category: 'Sociales', label: 'Agrede verbalmente a sus compañeros u otros' },
  { code: 'SOCIAL_CONFRONTS_AUTHORITY', category: 'Sociales', label: 'Frecuentemente confronta o se rebela a alguna autoridad' },
  { code: 'APPEARANCE_HAGGARD', category: 'Apariencia', label: 'Se le observa demacrado/a, ojeroso/a o cansado/a' },
  { code: 'APPEARANCE_NEGLECTED', category: 'Apariencia', label: 'Es extremadamente descuidado/a con su apariencia y aseo' },
  { code: 'MENTAL_HEALTH_ANXIOUS', category: 'Salud mental', label: 'Se le observa o escucha nervioso/a o con elevados niveles de ansiedad' },
  { code: 'MENTAL_HEALTH_DEPRESSED_SAD', category: 'Salud mental', label: 'Se le observa o escucha deprimido/a, triste, muy desmotivado/a' },
  { code: 'MENTAL_HEALTH_UNCLEAR_SPEECH', category: 'Salud mental', label: 'Tiene un discurso poco claro, confuso, alejado de la realidad' },
  { code: 'MENTAL_HEALTH_DEFENSIVE', category: 'Salud mental', label: 'Se muestra a la defensiva, desconfiado/a y suspicaz' },
];

export interface StudentReferral {
  id: string;
  studentId: string;
  referredById: string;
  checkedAspects: ReferralAspectCode[];
  reason: string;
  service: ReferralService;
  receivingInstance?: string;
  createdAt: string;
}

export interface CreateReferralData {
  checkedAspects: ReferralAspectCode[];
  reason: string;
  service: ReferralService;
  receivingInstance?: string;
}

/** Sugiere el servicio de derivación (HU-29) */
export function suggestReferralService(aspects: ReferralAspectCode[]): ReferralService {
  if (aspects.length === 0) return 'ESCUELA';
  
  const hasMentalHealth = aspects.some((a) => a.startsWith('MENTAL_HEALTH_'));
  const hasSocial = aspects.some((a) => a.startsWith('SOCIAL_'));
  const hasAppearance = aspects.some((a) => a.startsWith('APPEARANCE_'));
  const hasAcademic = aspects.some((a) => a.startsWith('ACADEMIC_'));

  if (hasMentalHealth) return 'PSICOLOGIA';
  if (hasSocial || hasAppearance) return 'PSICOPEDAGOGIA';
  if (hasAcademic) return 'ESCUELA';

  return 'ESCUELA';
}

function saveBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const referralService = {
  createReferral: async (studentId: string, data: CreateReferralData): Promise<StudentReferral> => {
    const response = await apiClient.post<{ message: string; referral: StudentReferral }>(
      `/students/${studentId}/referrals`,
      data,
    );
    return response.data.referral;
  },

  downloadConstancia: async (referralId: string): Promise<void> => {
    const response = await apiClient.get(`/referrals/${referralId}/constancia`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, 'constancia-derivacion.pdf');
  },
};
