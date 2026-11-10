import { apiClient } from '@shared/services/apiClient';

export type CertificateStatus = 'INICIADO' | 'EN_REVISION' | 'OBSERVADO' | 'RECHAZADO' | 'APROBADO' | 'GENERADO_SIN_FIRMA' | 'PENDIENTE_DE_FIRMA' | 'FIRMADO_INCORPORADO' | 'ENTREGADO' | 'ANULADO';

export type EvidenceResult = 'PENDIENTE' | 'CONFORME' | 'OBSERVADA';

/** Acciones que el servidor reconoce desde el estado; para cada una hace falta además el permiso (ver `certificatePermissions`). */
export type CertificateActionCode = 'SUBMIT' | 'RESUBMIT' | 'OBSERVE' | 'REJECT' | 'APPROVE' | 'GENERATE' | 'VOID';

export interface CertificateEvidence {
  id: string;
  kind: string;
  ref: string | null;
  result: EvidenceResult;
  comment: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
}

export interface CertificateFacts {
  acceptance: {
    status: string;
    respondedAt: string | null;
    cycle: number;
  } | null;
  sessionsHeld: number;
  semesterReportSubmitted: boolean;
}

export interface Certificate {
  id: string;
  status: CertificateStatus;
  isDemo: boolean;
  number: string | null;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  tutorId: string;
  tutorName: string;
  createdAt: string;
  hasUnsignedPdf: boolean;
  approvedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  reviewNote: string | null;
  pdfSha256: string | null;
  allowedActions: CertificateActionCode[];
}

export interface CertificateDetail extends Certificate {
  facts: CertificateFacts | null;
  evidences: CertificateEvidence[];
}

export interface CertificateCandidate {
  tutorId: string;
  tutorName: string;
  schoolId: string;
  schoolName: string;
  assignmentId: string;
  cycles: number[];
}

export interface CertificateOptions {
  periods: { id: string; name: string; isActive: boolean }[];
  currentPeriodId: string | null;
  schools: { id: string; name: string }[];
}

export interface CommitteeResolution {
  id: string;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  number: string;
  issuedOn: string;
}

export interface CertificateFilters {
  periodId: string;
  schoolId?: string;
  status?: string;
}

const clean = (filters: Record<string, string | undefined>) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
const one = async (request: Promise<{ data: { certificate: CertificateDetail } }>): Promise<CertificateDetail> => (await request).data.certificate;

export const certificateService = {
  options: async (): Promise<CertificateOptions> => (await apiClient.get<CertificateOptions>('/certificates/options')).data,
  list: async (filters: CertificateFilters): Promise<Certificate[]> =>
    (
      await apiClient.get<{ certificates: Certificate[] }>('/certificates', {
        params: clean({ ...filters }),
      })
    ).data.certificates,
  candidates: async (periodId: string, schoolId?: string): Promise<CertificateCandidate[]> =>
    (await apiClient.get<{ candidates: CertificateCandidate[] }>('/certificates/candidates', { params: clean({ periodId, schoolId }) })).data.candidates,
  get: (id: string) => one(apiClient.get(`/certificates/${id}`)),
  start: (input: { tutorId: string; periodId: string; schoolId: string }) => one(apiClient.post('/certificates', input)),
  submit: (id: string) => one(apiClient.post(`/certificates/${id}/submit`, {})),
  reviewEvidence: (id: string, evidenceId: string, input: { result: EvidenceResult; comment?: string }) => one(apiClient.put(`/certificates/${id}/evidences/${evidenceId}`, input)),
  observe: (id: string, note: string) => one(apiClient.post(`/certificates/${id}/observe`, { note })),
  reject: (id: string, reason: string) => one(apiClient.post(`/certificates/${id}/reject`, { reason })),
  approve: (id: string) => one(apiClient.post(`/certificates/${id}/approve`, {})),
  generate: (id: string) => one(apiClient.post(`/certificates/${id}/generate`, {})),
  void: (id: string, reason: string) => one(apiClient.post(`/certificates/${id}/void`, { reason })),
  resolutions: async (periodId: string, schoolId?: string): Promise<CommitteeResolution[]> =>
    (await apiClient.get<{ resolutions: CommitteeResolution[] }>('/committee-resolutions', { params: clean({ periodId, schoolId }) })).data.resolutions,
  saveResolution: async (input: { periodId: string; schoolId: string; number: string; issuedOn: string }): Promise<void> => {
    await apiClient.put('/committee-resolutions', input);
  },
  /** Baja el PDF con la sesión (el enlace directo no llevaría el token) y lo entrega al navegador como archivo. */
  downloadPdf: async (id: string, number: string | null): Promise<void> => {
    const response = await apiClient.get(`/certificates/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificado-${(number ?? id).replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export type CertificateAssetKind = 'universityLogo' | 'facultyLogo' | 'watermark' | 'signature';
export interface CertificateAssetStatus {
  kind: CertificateAssetKind;
  configured: boolean;
  editable: boolean;
}

const visualSettingsPath = (schoolId: string) => `/certificates/visual-settings/${schoolId}`;

export async function getCertificateVisualSettings(schoolId: string) {
  const { data } = await apiClient.get<{ assets: CertificateAssetStatus[] }>(visualSettingsPath(schoolId));
  return data.assets;
}

export async function saveCertificateAsset(schoolId: string, kind: CertificateAssetKind, file: File | null) {
  const path = `${visualSettingsPath(schoolId)}/${kind}`;
  if (!file) {
    await apiClient.delete(path);
    return;
  }
  const form = new FormData();
  form.append('file', file);
  await apiClient.put(path, form, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export interface CertificateTextSettingsView {
  template: { title: string; bodyText: string; editable: boolean };
  school: { department: string | null; signatoryName: string | null; signatoryRole: string | null; editable: boolean };
  defaults: { title: string; bodyText: string; department: string; signatoryName: string; signatoryRole: string };
  variables: string[];
}

const textSettingsPath = (schoolId: string) => `/certificates/text-settings/${schoolId}`;

export async function getCertificateTextSettings(schoolId: string) {
  const { data } = await apiClient.get<CertificateTextSettingsView>(textSettingsPath(schoolId));
  return data;
}

export async function saveCertificateTemplateText(schoolId: string, values: { title: string; bodyText: string }) {
  await apiClient.put(`${textSettingsPath(schoolId)}/template`, values);
}

export async function saveCertificateSchoolText(schoolId: string, values: { department: string; signatoryName: string; signatoryRole: string }) {
  await apiClient.put(`${textSettingsPath(schoolId)}/school`, values);
}
