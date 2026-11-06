import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { CERTIFICATE_STATUSES, isCertificateStatus } from '@domain/certification/certificateStatus';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { DEFAULT_EVIDENCE_KINDS, availableActions } from '@domain/certification/certificateWorkflow';
import { CertificateFacts, CertificateFactsReader } from '@domain/repositories/CertificateFactsReader';
import { CertificateEvidenceRecord, CertificateRecord, CertificateRepository } from '@domain/repositories/CertificateRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

export class CertificateForbiddenError extends Error {
  constructor(message = 'Tu cuenta no tiene escuelas o facultades asignadas para consultar certificados: pide a la administración que defina tu alcance') {
    super(message);
    this.name = 'CertificateForbiddenError';
  }
}

/** Fuera del alcance de quien consulta se responde igual que si no existiera: no se confirma que el trámite exista. */
export class CertificateNotFoundError extends Error {
  constructor() {
    super('Certificado no encontrado');
    this.name = 'CertificateNotFoundError';
  }
}

export class InvalidCertificateFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCertificateFilterError';
  }
}

/**
 * Escuelas cuyos certificados puede ver quien consulta. Reutiliza el alcance de los tutorados (`StudentAccessGuard`), que ya resuelve
 * la DBU, la coordinación, las políticas por persona y los roles a medida: así no hay una segunda definición de «mi escuela».
 * Un alcance sobre los propios estudiantes o ninguno no concede certificados (la entrega al docente llega más adelante).
 */
export type CertificateScope = { kind: 'ALL' } | { kind: 'SCHOOLS'; schoolIds: string[] };

export class CertificateScopeResolver {
  constructor(private readonly guard: StudentAccessGuard) {}

  async resolve(requesterId: string): Promise<CertificateScope> {
    const scope = await this.guard.scopeFor(requesterId);
    if (scope.kind === 'ALL') return { kind: 'ALL' };
    if (scope.kind === 'SCHOOLS' && scope.schoolIds.length > 0) return { kind: 'SCHOOLS', schoolIds: scope.schoolIds };
    throw new CertificateForbiddenError();
  }
}

export interface CertificateView {
  id: string;
  status: string;
  isDemo: boolean;
  number: string | null;
  periodId: string;
  periodName: string;
  schoolId: string;
  schoolName: string;
  tutorId: string;
  tutorName: string;
  createdAt: Date;
  hasUnsignedPdf: boolean;
  approvedAt: Date | null;
  voidedAt: Date | null;
  voidReason: string | null;
  reviewNote: string | null;
  /** Huella SHA-256 del PDF generado (nunca su ubicación). */
  pdfSha256: string | null;
  /** Acciones que proceden desde el estado actual; además hace falta el permiso de cada una (lo decide la ruta). */
  allowedActions: string[];
}

export interface CertificateDetailView extends CertificateView {
  /** Hechos que el sistema conoce, solo informativos para quien revisa (nunca aprueban nada). */
  facts: CertificateFacts | null;
  evidences: (Omit<CertificateEvidenceRecord, 'reviewedById'> & { reviewedByName: string | null })[];
}

export interface CertificateListFilters {
  periodId?: string;
  schoolId?: string;
  status?: string;
}

interface Names {
  schools: Map<string, string>;
  periods: Map<string, string>;
  people: Map<string, string>;
}

class CertificateViewBuilder {
  constructor(
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
  ) {}

  async names(rows: CertificateRecord[], extraUserIds: string[] = []): Promise<Names> {
    const schools = new Map((await this.schools.findAll()).map((s) => [s.id, s.name]));
    const periods = new Map((await this.periods.findAll()).map((p) => [p.id, p.name]));
    const people = new Map<string, string>();
    for (const id of new Set([...rows.map((r) => r.tutorId), ...extraUserIds])) {
      const user = await this.users.findById(id);
      if (user) people.set(id, `${user.firstName} ${user.lastName}`);
    }
    return { schools, periods, people };
  }

  view(row: CertificateRecord, names: Names): CertificateView {
    return {
      id: row.id,
      status: row.status,
      isDemo: row.isDemo,
      number: row.number,
      periodId: row.periodId,
      periodName: names.periods.get(row.periodId) ?? '',
      schoolId: row.schoolId,
      schoolName: names.schools.get(row.schoolId) ?? '',
      tutorId: row.tutorId,
      tutorName: names.people.get(row.tutorId) ?? 'Docente',
      createdAt: row.createdAt,
      hasUnsignedPdf: row.hasUnsignedPdf,
      approvedAt: row.approvedAt,
      voidedAt: row.voidedAt,
      voidReason: row.voidReason,
      reviewNote: row.reviewNote,
      pdfSha256: row.pdfSha256,
      allowedActions: availableActions(row.status, { isDemo: row.isDemo }),
    };
  }
}

/** Trámites de certificación dentro del alcance de quien consulta. */
export class ListCertificatesUseCase {
  private readonly builder: CertificateViewBuilder;

  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly certificates: CertificateRepository,
    users: UserRepository,
    schools: SchoolRepository,
    periods: AcademicPeriodRepository,
  ) {
    this.builder = new CertificateViewBuilder(users, schools, periods);
  }

  async execute(requesterId: string, filters: CertificateListFilters = {}): Promise<CertificateView[]> {
    if (filters.status && !isCertificateStatus(filters.status)) {
      throw new InvalidCertificateFilterError(`El estado debe ser uno de: ${CERTIFICATE_STATUSES.join(', ')}`);
    }
    const scope = await this.scope.resolve(requesterId);
    const rows = await this.certificates.list({ ...filters, ...(scope.kind === 'SCHOOLS' && { schoolIds: scope.schoolIds }) });
    const names = await this.builder.names(rows);
    return rows.map((row) => this.builder.view(row, names));
  }
}

/** Un trámite con sus evidencias; fuera del alcance se responde «no encontrado». */
export class GetCertificateUseCase {
  private readonly builder: CertificateViewBuilder;

  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly certificates: CertificateRepository,
    users: UserRepository,
    schools: SchoolRepository,
    periods: AcademicPeriodRepository,
    private readonly facts?: CertificateFactsReader,
  ) {
    this.builder = new CertificateViewBuilder(users, schools, periods);
  }

  async execute(requesterId: string, id: string): Promise<CertificateDetailView> {
    const scope = await this.scope.resolve(requesterId);
    const row = await this.certificates.findById(id);
    if (!row || (scope.kind === 'SCHOOLS' && !scope.schoolIds.includes(row.schoolId))) throw new CertificateNotFoundError();
    // Las evidencias nacen juntas y con la misma marca de tiempo: se ordenan siempre igual (el del proceso), las desconocidas al final.
    const rank = (kind: string) => {
      const index = (DEFAULT_EVIDENCE_KINDS as readonly string[]).indexOf(kind);
      return index === -1 ? DEFAULT_EVIDENCE_KINDS.length : index;
    };
    const evidences = [...(await this.certificates.evidencesOf(id))].sort((a, b) => rank(a.kind) - rank(b.kind) || a.id.localeCompare(b.id));
    const names = await this.builder.names([row], evidences.flatMap((e) => (e.reviewedById ? [e.reviewedById] : [])));
    return {
      ...this.builder.view(row, names),
      facts: this.facts ? await this.facts.factsFor({ assignmentId: row.assignmentId, periodId: row.periodId, tutorId: row.tutorId }) : null,
      evidences: evidences.map(({ reviewedById, ...evidence }) => ({ ...evidence, reviewedByName: reviewedById ? (names.people.get(reviewedById) ?? null) : null })),
    };
  }
}

export interface CertificateCandidateView {
  tutorId: string;
  tutorName: string;
  schoolId: string;
  schoolName: string;
  assignmentId: string;
  cycles: number[];
}

/** Docentes con designación aceptada sin trámite vigente, dentro del alcance de quien consulta (para iniciar su certificado). */
export class ListCertificateCandidatesUseCase {
  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly certificates: CertificateRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(requesterId: string, filters: { periodId: string; schoolId?: string }): Promise<CertificateCandidateView[]> {
    const scope = await this.scope.resolve(requesterId);
    const rows = await this.certificates.candidatesFor({ ...filters, ...(scope.kind === 'SCHOOLS' && { schoolIds: scope.schoolIds }) });
    const schools = new Map((await this.schools.findAll()).map((s) => [s.id, s.name]));
    const result: CertificateCandidateView[] = [];
    for (const row of rows) {
      const user = await this.users.findById(row.tutorId);
      if (!user || user.isActive === false) continue; // un docente dado de baja no se certifica
      result.push({ tutorId: row.tutorId, tutorName: `${user.firstName} ${user.lastName}`, schoolId: row.schoolId, schoolName: schools.get(row.schoolId) ?? '', assignmentId: row.assignmentId, cycles: row.cycles });
    }
    return result.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'es') || a.tutorName.localeCompare(b.tutorName, 'es'));
  }
}

export interface CertificateOptionsView {
  periods: { id: string; name: string; isActive: boolean }[];
  currentPeriodId: string | null;
  schools: { id: string; name: string }[];
}

/** Lo que la pantalla necesita para sus filtros: los periodos y solo las escuelas del alcance de quien consulta. */
export class GetCertificateOptionsUseCase {
  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly periods: AcademicPeriodRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(requesterId: string): Promise<CertificateOptionsView> {
    const scope = await this.scope.resolve(requesterId);
    const periods = await this.periods.findAll();
    const active = await this.periods.findActive();
    const schools = (await this.schools.findAll()).filter((s) => scope.kind === 'ALL' || scope.schoolIds.includes(s.id));
    return {
      periods: periods.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive })),
      currentPeriodId: active?.id ?? null,
      schools: schools.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    };
  }
}
