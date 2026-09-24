// Entrevista inicial tutorial (Anexo N° 3 del Protocolo, HU-14). Los datos de
// filiación ya presentes en Student (nombre, código, ciclo, escuela) no se
// duplican aquí; se obtienen uniendo por studentId.
export interface TutorInterview {
  id: string;
  studentId: string;
  conductedById: string;

  // I. Filiación adicional
  birthDate?: Date | null;
  originPlace?: string | null;
  age?: number | null;
  religion?: string | null;
  maritalStatus?: string | null;
  siblingsOrder?: string | null;
  address?: string | null;
  admissionYear?: number | null;

  // III. Motivo
  motiveAcademic: boolean;
  motivePersonalEmotional: boolean;
  motiveVocational: boolean;
  motiveDetail?: string | null;

  // IV. Aspectos tratados
  aspectsDiscussed: string;

  // V. Acuerdos
  agreements: string;

  createdAt: Date;
  updatedAt: Date;
}
