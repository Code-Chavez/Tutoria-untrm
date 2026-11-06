export interface CertificateRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  periodId: string;
  schoolId: string;
  tutorId: string;
  assignmentId: string | null;
  createdById: string;
  status: string;
  isDemo: boolean;
  number: string | null;
  templateId: string | null;
  hasUnsignedPdf: boolean;
  approvedById: string | null;
  approvedAt: Date | null;
  voidedById: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  reviewNote: string | null;
  /** Huella SHA-256 del PDF sin firma que se generó (nunca la clave de almacenamiento: esa solo la usa la descarga). */
  pdfSha256: string | null;
}

export interface CertificateEvidenceRecord {
  id: string;
  kind: string;
  ref: string | null;
  result: string;
  comment: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
}

export interface CertificateFilters {
  /** Escuelas que quien consulta puede ver; sin este filtro el alcance es total. */
  schoolIds?: string[];
  schoolId?: string;
  periodId?: string;
  status?: string;
}

/** Lectura de los trámites de certificación (el corte 2 solo consulta; las transiciones llegan en el corte 3). */
export interface CertificateRepository {
  list(filters?: CertificateFilters): Promise<CertificateRecord[]>;
  findById(id: string): Promise<CertificateRecord | null>;
  evidencesOf(certificateId: string): Promise<CertificateEvidenceRecord[]>;
  /** Dónde está el PDF sin firma y con qué huella se guardó; null si todavía no se generó. */
  pdfLocationOf(certificateId: string): Promise<{ storageKey: string; sha256: string } | null>;
}
