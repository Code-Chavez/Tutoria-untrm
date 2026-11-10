export interface CertificateSchoolSettings {
  department: string | null;
  signatoryName: string | null;
  signatoryRole: string | null;
}

export interface CertificateSchoolSettingsRepository {
  find(schoolId: string): Promise<CertificateSchoolSettings | null>;
  /** Crea o reemplaza lo configurado para la escuela. */
  save(schoolId: string, values: CertificateSchoolSettings): Promise<void>;
}
