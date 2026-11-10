import { createHash } from 'node:crypto';
import { CertificatePdfRenderer } from '@application/ports/CertificatePdfRenderer';
import { EvidenceStorage, StoredFileReader } from '@application/ports/EvidenceStorage';
import { DEFAULT_CERTIFICATE_CITY, DEMO_TEMPLATE, composeCertificateText } from '@domain/certification/certificateDocument';
import { DEMO_SEQUENCE_SCOPE, deriveAcronym, formatDemoCertificateNumber } from '@domain/certification/certificateNumber';
import { InvalidTransitionError, applyTransition } from '@domain/certification/certificateWorkflow';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CertificateRepository } from '@domain/repositories/CertificateRepository';
import { CertificateTemplateRepository } from '@domain/repositories/CertificateTemplateRepository';
import { CertificateWorkflowRepository } from '@domain/repositories/CertificateWorkflowRepository';
import { CommitteeResolutionRepository } from '@domain/repositories/CommitteeResolutionRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { CertificateScopeResolver } from './CertificateQueryUseCases';
import { CertificateSchoolNotFoundError, CertificateStateError, CertificateStep, InvalidCertificateInputError } from './CertificateWorkflowUseCases';

/** El modo de demostración está desactivado (en producción se activa solo con un parámetro explícito). */
export class DemoModeDisabledError extends Error {
  constructor() {
    super('El modo de demostración de certificados está desactivado en este entorno');
    this.name = 'DemoModeDisabledError';
  }
}

/** Falta un dato para generar el certificado (la resolución de decanato, la escuela, el docente…). */
export class CertificateNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CertificateNotReadyError';
  }
}

/** El archivo guardado ya no coincide con su huella (o no existe): no se entrega. */
export class CertificateFileIntegrityError extends Error {
  constructor() {
    super('El archivo del certificado no coincide con su huella registrada y no se entrega; avisa a la administración');
    this.name = 'CertificateFileIntegrityError';
  }
}

const sha256 = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');
const covers = (scope: Awaited<ReturnType<CertificateScopeResolver['resolve']>>, schoolId: string): boolean => scope.kind === 'ALL' || scope.schoolIds.includes(schoolId);

const NUMBER_MIN = 3;
const NUMBER_MAX = 60;

export interface ResolutionInput {
  periodId: string;
  schoolId: string;
  number: string;
  issuedOn: string;
}

/** Guarda la resolución de decanato de una escuela y periodo (una sola: guardar de nuevo la reemplaza). */
export class SaveCommitteeResolutionUseCase {
  constructor(
    private readonly scopes: CertificateScopeResolver,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly resolutions: CommitteeResolutionRepository,
    private readonly audit: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, input: ResolutionInput, ip?: string | null) {
    const scope = await this.scopes.resolve(requesterId);
    const school = await this.schools.findById(input.schoolId);
    if (!school || !covers(scope, school.id)) throw new CertificateSchoolNotFoundError();
    if (!(await this.periods.findById(input.periodId))) throw new InvalidCertificateInputError('El periodo no existe');
    const number = input.number.trim();
    if (number.length < NUMBER_MIN || number.length > NUMBER_MAX) throw new InvalidCertificateInputError(`El número de la resolución debe tener entre ${NUMBER_MIN} y ${NUMBER_MAX} caracteres`);
    const issuedOn = new Date(`${input.issuedOn}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn) || Number.isNaN(issuedOn.getTime()) || issuedOn.getUTCFullYear() < 2000) throw new InvalidCertificateInputError('La fecha de la resolución no es válida');
    if (issuedOn.getTime() > this.now().getTime() + 24 * 3_600_000) throw new InvalidCertificateInputError('La fecha de la resolución no puede ser futura');

    const saved = await this.resolutions.upsert({ periodId: input.periodId, schoolId: school.id, number, issuedOn, createdById: requesterId });
    await this.audit.create({ userId: requesterId, action: 'COMMITTEE_RESOLUTION_SAVED', entity: 'CommitteeResolution', entityId: saved.id, details: school.name, ipAddress: ip ?? null });
    return saved;
  }
}

export interface CommitteeResolutionView {
  id: string;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  number: string;
  issuedOn: Date;
}

export class ListCommitteeResolutionsUseCase {
  constructor(
    private readonly scopes: CertificateScopeResolver,
    private readonly resolutions: CommitteeResolutionRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
  ) {}

  async execute(requesterId: string, filters: { periodId?: string; schoolId?: string } = {}): Promise<CommitteeResolutionView[]> {
    const scope = await this.scopes.resolve(requesterId);
    const rows = await this.resolutions.list({ ...filters, ...(scope.kind === 'SCHOOLS' && { schoolIds: scope.schoolIds }) });
    const schools = new Map((await this.schools.findAll()).map((s) => [s.id, s.name]));
    const periods = new Map((await this.periods.findAll()).map((p) => [p.id, p.name]));
    return rows.map((r) => ({ id: r.id, periodId: r.periodId, periodName: periods.get(r.periodId) ?? '', schoolId: r.schoolId, schoolName: schools.get(r.schoolId) ?? '', number: r.number, issuedOn: r.issuedOn }));
  }
}

export interface GenerateCertificateDeps {
  schools: SchoolRepository;
  faculties: FacultyRepository;
  users: UserRepository;
  periods: AcademicPeriodRepository;
  resolutions: CommitteeResolutionRepository;
  templates: CertificateTemplateRepository;
  renderer: CertificatePdfRenderer;
  campuses: Pick<import('@domain/repositories/CampusRepository').CampusRepository, 'findById'> & Partial<Pick<import('@domain/repositories/CampusRepository').CampusRepository, 'campusIdsOf'>>;
  /** Departamento académico y autoridad que firma, configurados por escuela. */
  schoolSettings?: Pick<import('@domain/repositories/CertificateSchoolSettingsRepository').CertificateSchoolSettingsRepository, 'find'>;
  visuals?: Pick<import('./CertificateVisualSettings').CertificateVisualSettings, 'forDocument'>;
  storage: EvidenceStorage;
  /** `CERTIFICATE_DEMO_MODE`: sin plantilla oficial solo existen certificados de demostración. */
  demoMode: boolean;
}

/**
 * Genera el PDF sin firma de un trámite APROBADO y le asigna su número. El número, el estado y la referencia al archivo se escriben
 * en la misma transacción que bloquea el trámite: si algo falla o se revierte, el número no se consume y el archivo guardado se
 * borra; dos generaciones simultáneas dejan un solo PDF y un solo número (la segunda encuentra el trámite ya generado).
 */
export class GenerateCertificateUseCase extends CertificateStep {
  constructor(
    scopes: CertificateScopeResolver,
    certificates: CertificateRepository,
    workflow: CertificateWorkflowRepository,
    audit: AuditLogRepository,
    private readonly deps: GenerateCertificateDeps,
    now: () => Date = () => new Date(),
  ) {
    super(scopes, certificates, workflow, audit, now);
  }

  async execute(requesterId: string, id: string, ip?: string | null, campusId?: string | null) {
    if (!this.deps.demoMode) throw new DemoModeDisabledError();
    const row = await this.visible(requesterId, id);
    if (!row.isDemo) throw new CertificateStateError('No hay plantilla oficial: solo se generan certificados de demostración');
    try {
      applyTransition(row.status, 'GENERATE', { isDemo: row.isDemo });
    } catch (error) {
      if (error instanceof InvalidTransitionError) throw new CertificateStateError(error.message);
      throw error;
    }

    const resolution = await this.deps.resolutions.find(row.periodId, row.schoolId);
    if (!resolution) throw new CertificateNotReadyError('Registra la resolución de decanato de la escuela y el periodo antes de generar el certificado');
    const school = await this.deps.schools.findById(row.schoolId);
    const faculty = school ? (await this.deps.faculties.findAll()).find((f) => f.id === school.facultyId) : undefined;
    const tutor = await this.deps.users.findById(row.tutorId);
    const period = await this.deps.periods.findById(row.periodId);
    if (!school || !faculty || !tutor || !period) throw new CertificateNotReadyError('Faltan datos de la escuela, la facultad, el docente o el periodo para generar el certificado');
    const template = await this.deps.templates.ensure({ ...DEMO_TEMPLATE, isDemo: true });
    // La ciudad de la fecha es la de la sede de la escuela; sin sede o sin ciudad configurada se usa la predeterminada.
    // Una escuela puede dictarse en varias sedes (central y filial): quien emite elige la sede y se imprime su ciudad; sin elegir, la principal.
    if (campusId) {
      const taughtIn = (await this.deps.campuses.campusIdsOf?.(school.id)) ?? (school.campusId ? [school.campusId] : []);
      if (!taughtIn.includes(campusId)) throw new InvalidCertificateInputError('La escuela no se dicta en la sede elegida');
    }
    const chosenCampusId = campusId || school.campusId || null;
    const campus = chosenCampusId ? await this.deps.campuses.findById(chosenCampusId) : null;
    const city = campus?.city?.trim() || DEFAULT_CERTIFICATE_CITY;

    const configured = await this.deps.schoolSettings?.find(school.id);
    const visuals = await this.deps.visuals?.forDocument(requesterId, school.id, faculty.id);
    const signer = visuals?.signature ? await this.deps.users.findById(requesterId) : null;
    let savedKey: string | undefined;
    try {
      const updated = await this.move(id, async (current, _evidences, tools) => {
        const status = applyTransition(current.status, 'GENERATE', { isDemo: current.isDemo });
        const issuedOn = this.now();
        const year = issuedOn.getUTCFullYear();
        const number = formatDemoCertificateNumber(await tools.nextSequence(DEMO_SEQUENCE_SCOPE, year), year, deriveAcronym(faculty.name), deriveAcronym(school.name));
        const tutorName = `${tutor.firstName} ${tutor.lastName}`;
        // Sin departamento académico configurado se usa el nombre de la escuela y la instantánea lo deja dicho.
        const printed = {
          number,
          tutorName,
          schoolName: school.name,
          facultyName: faculty.name,
          department: configured?.department || school.name,
          periodName: period.name,
          resolutionNumber: resolution.number,
          city,
          issuedOn,
          signatoryName: configured?.signatoryName ?? null,
          signatoryRole: configured?.signatoryRole ?? null,
        };
        const text = composeCertificateText({ ...printed, title: template.title, bodyTemplate: template.bodyText });
        if (signer && !printed.signatoryName) {
          text.signatory = [`${signer.firstName} ${signer.lastName}`, 'Firma visual de demostración', faculty.name];
        }
        const buffer = await this.deps.renderer.render(text, visuals);
        savedKey = await this.deps.storage.save(buffer, `${number}.pdf`);
        return {
          status,
          number,
          templateId: template.id,
          unsignedSha256: sha256(buffer),
          unsignedStorageKey: savedKey,
          snapshot: {
            ...printed,
            tutorId: tutor.id,
            schoolId: school.id,
            facultyId: faculty.id,
            periodId: period.id,
            resolutionIssuedOn: resolution.issuedOn,
            departmentIsPlaceholder: !configured?.department,
            campusId: campus?.id ?? null,
            campusName: campus?.name ?? null,
            template: { id: template.id, name: template.name, version: template.version, title: template.title },
            ...(signer && { visualSignatureOwnerId: signer.id }),
            demo: true,
          },
        };
      });
      await this.record(requesterId, 'CERTIFICATE_GENERATED', id, `${updated.number} → ${updated.status}`, ip);
      return updated;
    } catch (error) {
      // La transacción no confirmó: el archivo que se alcanzó a guardar queda huérfano y se borra.
      if (savedKey) await this.deps.storage.delete(savedKey).catch(() => undefined);
      throw error;
    }
  }
}

export interface CertificatePdf {
  buffer: Buffer;
  fileName: string;
}

/** Entrega el PDF sin firma a quien lo ve; verifica la huella sobre los mismos bytes que envía. Fuera del alcance: «no encontrado». */
export class DownloadCertificatePdfUseCase extends CertificateStep {
  constructor(
    scopes: CertificateScopeResolver,
    certificates: CertificateRepository,
    workflow: CertificateWorkflowRepository,
    audit: AuditLogRepository,
    private readonly reader: StoredFileReader,
    now: () => Date = () => new Date(),
  ) {
    super(scopes, certificates, workflow, audit, now);
  }

  async execute(requesterId: string, id: string): Promise<CertificatePdf> {
    const row = await this.visible(requesterId, id);
    const location = await this.certificates.pdfLocationOf(id);
    if (!location || !row.number) throw new CertificateStateError('El certificado todavía no tiene un PDF generado');
    let buffer: Buffer;
    try {
      buffer = await this.reader.read(location.storageKey);
    } catch {
      throw new CertificateFileIntegrityError();
    }
    if (sha256(buffer) !== location.sha256) throw new CertificateFileIntegrityError();
    return { buffer, fileName: `certificado-${row.number}`.replace(/[^A-Za-z0-9._-]+/g, '-') + '.pdf' };
  }
}
