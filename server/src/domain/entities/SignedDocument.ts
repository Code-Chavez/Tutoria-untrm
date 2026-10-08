export type SignedDocumentKind = 'REFERRAL_CONSTANCIA' | 'ATTENDANCE_SHEET';

/** Documento impreso, firmado a mano y escaneado (A14). */
export interface SignedDocument {
  id: string;
  kind: SignedDocumentKind;
  referralId: string | null;
  studentId: string | null;
  periodId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  /** Huella SHA-256 del archivo tal como se adjuntó. */
  sha256: string;
  uploadedById: string;
  createdAt: Date;
}

/** Lo que se muestra de un documento firmado (sin la clave de almacenamiento). */
export interface SignedDocumentView extends Omit<SignedDocument, 'storageKey'> {
  uploadedByName: string;
}
