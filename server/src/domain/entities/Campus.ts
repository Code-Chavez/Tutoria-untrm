export interface Campus {
  id: string;
  name: string;
  /** Ciudad donde está la sede (para la fecha del certificado). */
  city: string | null;
  isActive: boolean;
  createdAt: Date;
}
