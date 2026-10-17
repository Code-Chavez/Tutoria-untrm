import { createHash } from 'node:crypto';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { TUTOR_ROLE_NAME } from '@application/use-cases/assignments/TutorValidation';
import { Admonition, AdmonitionRepository } from '@domain/repositories/AdmonitionRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

export const DEAN_ROLE_NAME = 'Decano';
const DBU_ROLE_NAME = 'Administrador DBU';
const REASON_MIN = 10;
const REASON_MAX = 1000;

export class AdmonitionForbiddenError extends Error {
  constructor(message = 'No tienes acceso a esta amonestación') {
    super(message);
    this.name = 'AdmonitionForbiddenError';
  }
}
export class AdmonitionNotFoundError extends Error {
  constructor() {
    super('La amonestación no existe');
    this.name = 'AdmonitionNotFoundError';
  }
}
export class AdmonitionTutorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdmonitionTutorError';
  }
}
export class InvalidAdmonitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdmonitionError';
  }
}

/** Alcance de quien consulta o emite: el Decano, su facultad; la DBU, todo; la coordinación, sus escuelas (solo lectura). */
export type AdmonitionScope = { kind: 'ALL' } | { kind: 'FACULTY'; facultyId: string } | { kind: 'SCHOOLS'; schoolIds: string[] };

export class AdmonitionScopeResolver {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async resolve(userId: string): Promise<{ scope: AdmonitionScope; canIssue: boolean }> {
    const user = await this.users.findById(userId);
    const role = user ? await this.roles.findById(user.roleId) : null;
    if (!user || !role) throw new AdmonitionForbiddenError();
    if (role.name === DBU_ROLE_NAME) return { scope: { kind: 'ALL' }, canIssue: true };
    if (role.name === DEAN_ROLE_NAME) {
      if (!user.facultyId) throw new AdmonitionForbiddenError('Tu cuenta de Decano no tiene facultad asignada: pide a la DBU que la indique');
      return { scope: { kind: 'FACULTY', facultyId: user.facultyId }, canIssue: true };
    }
    const scope = await this.guard.scopeFor(userId);
    if (scope.kind === 'SCHOOLS') return { scope: { kind: 'SCHOOLS', schoolIds: scope.schoolIds }, canIssue: false };
    if (scope.kind === 'ALL') return { scope: { kind: 'ALL' }, canIssue: false };
    throw new AdmonitionForbiddenError();
  }
}

export interface TutorOption {
  tutorId: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
}

/** Docentes tutores que quien consulta puede amonestar (los de su facultad). */
export class ListAdmonishableTutorsUseCase {
  constructor(
    private readonly resolver: AdmonitionScopeResolver,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
  ) {}

  async execute(requesterId: string): Promise<TutorOption[]> {
    const { scope, canIssue } = await this.resolver.resolve(requesterId);
    if (!canIssue) throw new AdmonitionForbiddenError();
    const role = await this.roles.findByName(TUTOR_ROLE_NAME);
    if (!role) return [];
    const schools = new Map((await this.schools.findAll()).map((s) => [s.id, s]));
    return (await this.users.findAll({ isActive: true, roleId: role.id }))
      .filter((t) => t.schoolId && schools.has(t.schoolId) && (scope.kind === 'ALL' || (scope.kind === 'FACULTY' && schools.get(t.schoolId)?.facultyId === scope.facultyId)))
      .map((t) => ({ tutorId: t.id, fullName: `${t.firstName} ${t.lastName}`, schoolId: t.schoolId as string, schoolName: schools.get(t.schoolId as string)?.name ?? '' }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  }
}

export interface IssueAdmonitionInput {
  tutorId: string;
  issuedOn: string;
  reason: string;
  file?: { buffer: Buffer; fileName: string; mimeType: string; fileSize: number };
}

/**
 * El Decano registra la amonestación a un docente tutor de su facultad: fecha, motivo y, si se tiene, el documento (resolución o
 * memorándum). El sistema solo la deja registrada con su huella; no aplica ninguna sanción.
 */
export class IssueAdmonitionUseCase {
  constructor(
    private readonly resolver: AdmonitionScopeResolver,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly admonitions: AdmonitionRepository,
    private readonly storage: EvidenceStorage,
    private readonly audit: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, input: IssueAdmonitionInput, ip?: string | null): Promise<Admonition> {
    const { scope, canIssue } = await this.resolver.resolve(requesterId);
    if (!canIssue) throw new AdmonitionForbiddenError();

    const reason = input.reason?.trim() ?? '';
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) throw new InvalidAdmonitionError(`El motivo debe tener entre ${REASON_MIN} y ${REASON_MAX} caracteres`);
    const issuedOn = new Date(`${input.issuedOn}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn) || Number.isNaN(issuedOn.getTime())) throw new InvalidAdmonitionError('La fecha no es válida');
    if (issuedOn.getTime() > this.now().getTime() + 24 * 3_600_000) throw new InvalidAdmonitionError('La fecha no puede ser futura');

    const tutorRole = await this.roles.findByName(TUTOR_ROLE_NAME);
    const tutor = await this.users.findById(input.tutorId);
    if (!tutor || !tutorRole || tutor.roleId !== tutorRole.id) throw new AdmonitionTutorError('El docente no existe o no es un docente tutor');
    const school = tutor.schoolId ? (await this.schools.findAll()).find((s) => s.id === tutor.schoolId) : undefined;
    if (!school) throw new AdmonitionTutorError('El docente no tiene escuela registrada: la DBU debe indicársela');
    if (scope.kind === 'FACULTY' && school.facultyId !== scope.facultyId) throw new AdmonitionTutorError('Solo puede amonestar a docentes de su propia facultad');

    const stored = input.file
      ? {
          fileName: input.file.fileName,
          mimeType: input.file.mimeType,
          fileSize: input.file.fileSize,
          storageKey: await this.storage.save(input.file.buffer, input.file.fileName),
          sha256: createHash('sha256').update(input.file.buffer).digest('hex'),
        }
      : {};
    const created = await this.admonitions.create({ tutorId: tutor.id, issuedById: requesterId, schoolId: school.id, facultyId: school.facultyId, issuedOn, reason, ...stored });
    await this.audit.create({
      userId: requesterId,
      action: 'ADMONITION_ISSUED',
      entity: 'Admonition',
      entityId: created.id,
      details: `${school.name}${input.file ? ' · con documento' : ''}`,
      ipAddress: ip ?? null,
    });
    return created;
  }
}

export interface AdmonitionView {
  id: string;
  tutorId: string;
  tutorName: string;
  schoolName: string;
  issuedOn: Date;
  reason: string;
  issuedByName: string;
  hasFile: boolean;
  fileName: string | null;
}

/** Lista de amonestaciones dentro del alcance (el Decano, su facultad; la coordinación, sus escuelas; la DBU, todas). */
export class ListAdmonitionsUseCase {
  constructor(
    private readonly resolver: AdmonitionScopeResolver,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly admonitions: AdmonitionRepository,
  ) {}

  async execute(requesterId: string): Promise<AdmonitionView[]> {
    const { scope } = await this.resolver.resolve(requesterId);
    const rows = await this.admonitions.list(
      scope.kind === 'FACULTY' ? { facultyId: scope.facultyId } : scope.kind === 'SCHOOLS' ? { schoolIds: scope.schoolIds } : {},
    );
    const schools = new Map((await this.schools.findAll()).map((s) => [s.id, s.name]));
    const people = new Map<string, string>();
    for (const id of new Set(rows.flatMap((r) => [r.tutorId, r.issuedById]))) {
      const user = await this.users.findById(id);
      if (user) people.set(id, `${user.firstName} ${user.lastName}`);
    }
    return rows.map((r) => ({
      id: r.id,
      tutorId: r.tutorId,
      tutorName: people.get(r.tutorId) ?? 'Docente',
      schoolName: schools.get(r.schoolId) ?? '',
      issuedOn: r.issuedOn,
      reason: r.reason,
      issuedByName: people.get(r.issuedById) ?? '',
      hasFile: !!r.storageKey,
      fileName: r.fileName ?? null,
    }));
  }
}

/** Entrega el documento de una amonestación solo a quien la ve; fuera del alcance se responde «no encontrada». */
export class GetAdmonitionFileUseCase {
  constructor(
    private readonly resolver: AdmonitionScopeResolver,
    private readonly admonitions: AdmonitionRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(id: string, requesterId: string): Promise<{ fileName: string; absolutePath: string }> {
    const { scope } = await this.resolver.resolve(requesterId).catch(() => {
      throw new AdmonitionNotFoundError();
    });
    const row = await this.admonitions.findById(id);
    const visible =
      !!row &&
      (scope.kind === 'ALL' || (scope.kind === 'FACULTY' && row.facultyId === scope.facultyId) || (scope.kind === 'SCHOOLS' && scope.schoolIds.includes(row.schoolId)));
    if (!row || !visible || !row.storageKey || !row.fileName) throw new AdmonitionNotFoundError();
    return { fileName: row.fileName, absolutePath: this.storage.resolvePath(row.storageKey) };
  }
}
