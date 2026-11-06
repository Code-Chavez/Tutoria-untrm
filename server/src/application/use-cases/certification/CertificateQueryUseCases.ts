import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { CERTIFICATE_STATUSES, isCertificateStatus } from '@domain/certification/certificateStatus';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
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
}

export interface CertificateDetailView extends CertificateView {
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
  ) {
    this.builder = new CertificateViewBuilder(users, schools, periods);
  }

  async execute(requesterId: string, id: string): Promise<CertificateDetailView> {
    const scope = await this.scope.resolve(requesterId);
    const row = await this.certificates.findById(id);
    if (!row || (scope.kind === 'SCHOOLS' && !scope.schoolIds.includes(row.schoolId))) throw new CertificateNotFoundError();
    const evidences = await this.certificates.evidencesOf(id);
    const names = await this.builder.names([row], evidences.flatMap((e) => (e.reviewedById ? [e.reviewedById] : [])));
    return {
      ...this.builder.view(row, names),
      evidences: evidences.map(({ reviewedById, ...evidence }) => ({ ...evidence, reviewedByName: reviewedById ? (names.people.get(reviewedById) ?? null) : null })),
    };
  }
}
