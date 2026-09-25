import { z } from 'zod';

// Catálogo cerrado del checklist "Aspectos a Observar" (Anexo N°6). Igual que
// la modalidad de sesión, se hardcodea aquí como literales — el enrutamiento
// automático por aspecto (Art. 21) es HU-29, no esta validación de forma.
const REFERRAL_ASPECT_CODES = [
  'ACADEMIC_AT_RISK_OF_FAILING',
  'ACADEMIC_MISSING_ASSIGNMENTS',
  'ACADEMIC_UNEXPLAINED_ABSENCES',
  'ACADEMIC_DIFFICULTY_CONCENTRATING',
  'ACADEMIC_PRACTICAL_VS_WRITTEN_GAP',
  'ACADEMIC_DIFFICULTY_UNDERSTANDING',
  'SOCIAL_FREEZES_IN_PUBLIC',
  'SOCIAL_NO_GROUP_PARTICIPATION',
  'SOCIAL_IMPULSIVE',
  'SOCIAL_VERBALLY_AGGRESSIVE',
  'SOCIAL_CONFRONTS_AUTHORITY',
  'APPEARANCE_HAGGARD',
  'APPEARANCE_NEGLECTED',
  'MENTAL_HEALTH_ANXIOUS',
  'MENTAL_HEALTH_DEPRESSED_SAD',
  'MENTAL_HEALTH_UNCLEAR_SPEECH',
  'MENTAL_HEALTH_DEFENSIVE',
] as const;

export const createReferralSchema = z.object({
  checkedAspects: z
    .array(z.enum(REFERRAL_ASPECT_CODES))
    .min(1, 'Marca al menos un aspecto observado'),
  reason: z.string().trim().min(3, 'Indique el motivo de la derivación').max(1000),
  service: z.enum(['ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']),
});

export type CreateReferralBody = z.infer<typeof createReferralSchema>;
