export type CampusKind = 'SEDE' | 'FILIAL';
export const CAMPUS_KINDS: CampusKind[] = ['SEDE', 'FILIAL'];

export interface Campus {
  id: string;
  name: string;
  /** Ciudad donde está la sede (para la fecha del certificado). */
  city: string | null;
  /** SEDE o FILIAL. */
  kind: CampusKind;
  isActive: boolean;
  createdAt: Date;
}
