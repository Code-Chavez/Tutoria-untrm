import { Campus, CampusKind, CAMPUS_KINDS } from '@domain/entities/Campus';
import { CampusRepository } from '@domain/repositories/CampusRepository';
import { School } from '@domain/entities/School';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

export class DuplicateCampusError extends Error {
  constructor(name: string) {
    super(`Ya existe una sede llamada «${name}»`);
    this.name = 'DuplicateCampusError';
  }
}
export class CampusNotFoundError extends Error {
  constructor() {
    super('La sede no existe');
    this.name = 'CampusNotFoundError';
  }
}
export class InvalidCampusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCampusError';
  }
}
export class SchoolNotFoundForCampusError extends Error {
  constructor() {
    super('La escuela no existe');
    this.name = 'SchoolNotFoundForCampusError';
  }
}

function cleanName(name: unknown): string {
  const value = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (value.length < 3 || value.length > 80) throw new InvalidCampusError('El nombre de la sede debe tener entre 3 y 80 caracteres');
  return value;
}

/** Ciudad de la sede: texto corto sin caracteres de control; vacío la quita (se usa la ciudad predeterminada). */
function cleanCity(city: unknown): string | null {
  if (city === null || city === undefined) return null;
  const value = typeof city === 'string' ? city.trim().replace(/\s+/g, ' ') : '';
  if (value === '') return null;
  if (value.length > 80 || /\p{Cc}/u.test(value)) throw new InvalidCampusError('La ciudad debe tener hasta 80 caracteres y no puede incluir caracteres de control');
  return value;
}

function cleanKind(kind: unknown): CampusKind {
  if (!CAMPUS_KINDS.includes(kind as CampusKind)) throw new InvalidCampusError('El tipo de sede debe ser «Sede» o «Filial»');
  return kind as CampusKind;
}

/** Sedes y escuelas con su sede: lo que necesita la pantalla de quien las configura (Vicerrectorado no ve estudiantes). */
export class ListCampusesUseCase {
  constructor(private readonly campuses: CampusRepository, private readonly schools: SchoolRepository) {}
  async execute(): Promise<{ campuses: Campus[]; schools: Array<Pick<School, 'id' | 'name' | 'facultyId' | 'campusId'>> }> {
    const [campuses, schools] = await Promise.all([this.campuses.findAll(), this.schools.findAll()]);
    return { campuses, schools: schools.map((s) => ({ id: s.id, name: s.name, facultyId: s.facultyId, campusId: s.campusId ?? null })) };
  }
}

export class CreateCampusUseCase {
  constructor(private readonly campuses: CampusRepository, private readonly audit: AuditLogRepository) {}
  async execute(actingUserId: string, name: string, ip?: string | null, kind?: unknown): Promise<Campus> {
    const created = await this.campuses.create(cleanName(name), kind === undefined ? 'SEDE' : cleanKind(kind));
    await this.audit.create({ userId: actingUserId, action: 'CAMPUS_CREATED', entity: 'Campus', entityId: created.id, details: `${created.kind === 'FILIAL' ? 'Filial' : 'Sede'} «${created.name}» creada`, ipAddress: ip ?? null });
    return created;
  }
}

export class UpdateCampusUseCase {
  constructor(private readonly campuses: CampusRepository, private readonly audit: AuditLogRepository) {}
  async execute(actingUserId: string, id: string, changes: { name?: string; isActive?: boolean; city?: string | null; kind?: string }, ip?: string | null): Promise<Campus> {
    if (!(await this.campuses.findById(id))) throw new CampusNotFoundError();
    let updated: Campus | null = null;
    if (changes.name !== undefined) updated = await this.campuses.rename(id, cleanName(changes.name));
    if (changes.isActive !== undefined) updated = await this.campuses.setActive(id, changes.isActive);
    if (changes.city !== undefined) updated = await this.campuses.setCity(id, cleanCity(changes.city));
    if (changes.kind !== undefined) updated = await this.campuses.setKind(id, cleanKind(changes.kind));
    if (!updated) throw new InvalidCampusError('No hay cambios que guardar');
    await this.audit.create({ userId: actingUserId, action: 'CAMPUS_UPDATED', entity: 'Campus', entityId: id, details: `${updated.kind === 'FILIAL' ? 'Filial' : 'Sede'} «${updated.name}» (${updated.isActive ? 'activa' : 'inactiva'}), ciudad: ${updated.city ?? 'predeterminada'}`, ipAddress: ip ?? null });
    return updated;
  }
}

/** Cada escuela pertenece a una sola sede; Vicerrectorado o la DBU la fijan. */
export class SetSchoolCampusUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly campuses: CampusRepository,
    private readonly audit: AuditLogRepository,
  ) {}
  async execute(actingUserId: string, schoolId: string, campusId: string, ip?: string | null): Promise<void> {
    const school = await this.schools.findById(schoolId);
    if (!school) throw new SchoolNotFoundForCampusError();
    const campus = await this.campuses.findById(campusId);
    if (!campus || !campus.isActive) throw new CampusNotFoundError();
    await this.campuses.setSchoolCampus(schoolId, campusId);
    await this.audit.create({ userId: actingUserId, action: 'SCHOOL_CAMPUS_SET', entity: 'School', entityId: schoolId, details: `«${school.name}» → «${campus.name}»`, ipAddress: ip ?? null });
  }
}
