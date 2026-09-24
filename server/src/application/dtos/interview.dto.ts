export interface CreateInterviewInput {
  birthDate?: string; // ISO date
  originPlace?: string;
  age?: number;
  religion?: string;
  maritalStatus?: string;
  siblingsOrder?: string;
  address?: string;
  admissionYear?: number;

  motiveAcademic: boolean;
  motivePersonalEmotional: boolean;
  motiveVocational: boolean;
  motiveDetail?: string;

  aspectsDiscussed: string;
  agreements: string;
}
