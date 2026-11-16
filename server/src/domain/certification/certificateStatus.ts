/**
 * Estados del trámite de certificación del docente tutor. La lista es la misma que impone la base de datos
 * (restricción `certificates_status_check` de la migración `certification_model`): si cambia una, cambia la otra.
 */
export const CERTIFICATE_STATUSES = [
  'INICIADO',
  'EN_REVISION',
  'OBSERVADO',
  'RECHAZADO',
  'APROBADO',
  'GENERADO_SIN_FIRMA',
  'PENDIENTE_DE_FIRMA',
  'FIRMADO_INCORPORADO',
  'ENTREGADO',
  'ANULADO',
] as const;

export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const isCertificateStatus = (value: string): value is CertificateStatus => (CERTIFICATE_STATUSES as readonly string[]).includes(value);

/** Resultado de la revisión de una evidencia: lo decide una persona, nunca el sistema. */
export const EVIDENCE_RESULTS = ['PENDIENTE', 'CONFORME', 'OBSERVADA'] as const;
export type EvidenceResult = (typeof EVIDENCE_RESULTS)[number];
