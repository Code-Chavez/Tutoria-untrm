import {
  TutoringRequestSource,
  TutoringCaseType,
} from '@domain/entities/TutoringRequest';

export interface CreateTutoringRequestInput {
  source: TutoringRequestSource;
  // Requeridos cuando source === 'INSTRUCTOR' (Art. 19.c); ese rol no existe
  // en el sistema, así que se registran en texto libre.
  instructorName?: string;
  courseName?: string;
  caseType: TutoringCaseType;
  reason: string;
}
