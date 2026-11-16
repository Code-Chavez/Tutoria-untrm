import { isCertificateStatus } from '@domain/certification/certificateStatus';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { TutorTeacherData, TutorTeacherReader } from '@domain/repositories/TutorTeacherReader';
import { CertificateScopeResolver, InvalidCertificateFilterError } from './CertificateQueryUseCases';

/** Cómo está la designación de un docente en una escuela y periodo. `SIN_ASIGNACION` es que no atiende ningún ciclo ahí. */
export const TEACHER_ACCEPTANCE_STATES = ['SIN_ASIGNACION', 'SIN_SOLICITAR', 'PENDIENTE', 'VENCIDA', 'ACEPTADA', 'RECHAZADA'] as const;
export type TeacherAcceptance = (typeof TEACHER_ACCEPTANCE_STATES)[number];

const isAcceptanceState = (value: string): value is TeacherAcceptance => (TEACHER_ACCEPTANCE_STATES as readonly string[]).includes(value);

/** Los trámites anulados o rechazados no cuentan como vigentes: el docente puede iniciar otro. */
const CLOSED_CERTIFICATE = ['ANULADO', 'RECHAZADO'];

/** Filtro de trámite que significa «sin ningún trámite registrado». */
export const NO_CERTIFICATE = 'SIN_TRAMITE';

export interface TutorTeacherView {
  tutorId: string;
  tutorName: string;
  schoolId: string | null;
  schoolName: string;
  cycles: { cycle: number; acceptance: TeacherAcceptance }[];
  /** Resumen de la designación: ACEPTADA solo si todos sus ciclos lo están; si no, el que más atención pide. */
  acceptance: TeacherAcceptance;
  certificateId: string | null;
  certificateStatus: string | null;
  /** Hay una designación aceptada y ningún trámite vigente. Además hace falta el permiso de registrar (lo decide la ruta). */
  canStartCertificate: boolean;
}

export interface TutorTeacherFilters {
  periodId: string;
  schoolId?: string;
  /** Estado de la designación (uno de `TEACHER_ACCEPTANCE_STATES`). */
  status?: string;
  /** `SIN_TRAMITE` o un estado de certificado. */
  certificateStatus?: string;
  /** Texto del nombre, sin distinguir mayúsculas ni tildes. */
  q?: string;
}

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// De mayor a menor atención; el resumen de un docente con ciclos distintos es el primero que aparezca entre sus ciclos.
const ATTENTION: TeacherAcceptance[] = ['RECHAZADA', 'VENCIDA', 'PENDIENTE', 'SIN_SOLICITAR', 'ACEPTADA'];

function acceptanceOf(status: string, expiresAt: Date | null, now: Date): TeacherAcceptance {
  if (status === 'ACEPTADA' || status === 'RECHAZADA' || status === 'SIN_SOLICITAR') return status;
  if (status === 'PENDIENTE') return expiresAt && expiresAt.getTime() < now.getTime() ? 'VENCIDA' : 'PENDIENTE';
  return 'SIN_SOLICITAR';
}

/** Arma una fila por docente y escuela. Es una función pura: la lista se prueba sin base de datos. */
export function buildTutorTeacherRows(data: TutorTeacherData, names: Map<string, string>, now: Date): TutorTeacherView[] {
  const key = (tutorId: string, schoolId: string | null) => `${tutorId}|${schoolId ?? ''}`;
  const rows = new Map<string, { tutorId: string; schoolId: string | null; cycles: { cycle: number; acceptance: TeacherAcceptance }[] }>();
  for (const a of data.assignments) {
    const k = key(a.tutorId, a.schoolId);
    const row = rows.get(k) ?? { tutorId: a.tutorId, schoolId: a.schoolId, cycles: [] };
    row.cycles.push({ cycle: a.cycle, acceptance: acceptanceOf(a.acceptanceStatus, a.acceptanceExpiresAt, now) });
    rows.set(k, row);
  }
  const assigned = new Set(data.assignments.map((a) => a.tutorId));
  for (const t of data.teachers) {
    // Un docente sin ninguna designación en el periodo aparece una vez, en la escuela de su cuenta.
    if (!assigned.has(t.id)) rows.set(key(t.id, t.schoolId), { tutorId: t.id, schoolId: t.schoolId, cycles: [] });
  }
  const people = new Map(data.teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));

  const result: TutorTeacherView[] = [];
  for (const row of rows.values()) {
    const tutorName = people.get(row.tutorId);
    if (!tutorName) continue; // un docente dado de baja no figura
    const certificates = data.certificates.filter((c) => c.tutorId === row.tutorId && c.schoolId === row.schoolId);
    const live = certificates.filter((c) => !CLOSED_CERTIFICATE.includes(c.status));
    const shown = [...(live.length > 0 ? live : certificates)].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    const cycles = [...row.cycles].sort((a, b) => a.cycle - b.cycle);
    const acceptance: TeacherAcceptance =
      cycles.length === 0 ? 'SIN_ASIGNACION' : (ATTENTION.find((state) => cycles.some((c) => c.acceptance === state)) as TeacherAcceptance);
    result.push({
      tutorId: row.tutorId,
      tutorName,
      schoolId: row.schoolId,
      schoolName: row.schoolId ? (names.get(row.schoolId) ?? '') : 'Sin escuela',
      cycles,
      acceptance,
      certificateId: shown?.id ?? null,
      certificateStatus: shown?.status ?? null,
      canStartCertificate: cycles.some((c) => c.acceptance === 'ACEPTADA') && live.length === 0,
    });
  }
  return result.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'es') || a.tutorName.localeCompare(b.tutorName, 'es'));
}

/**
 * Docentes tutores de un periodo con su designación y su trámite de certificación, dentro del alcance de quien consulta.
 * Reutiliza el alcance de los certificados (`CertificateScopeResolver`): una cuenta sin escuelas recibe 403 y una escuela fuera del
 * alcance no se abre al pedirla por filtro (la lista llega vacía).
 */
export class ListTutorTeachersUseCase {
  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly reader: TutorTeacherReader,
    private readonly schools: SchoolRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(requesterId: string, filters: TutorTeacherFilters): Promise<TutorTeacherView[]> {
    if (filters.status && !isAcceptanceState(filters.status)) {
      throw new InvalidCertificateFilterError(`El estado debe ser uno de: ${TEACHER_ACCEPTANCE_STATES.join(', ')}`);
    }
    if (filters.certificateStatus && filters.certificateStatus !== NO_CERTIFICATE && !isCertificateStatus(filters.certificateStatus)) {
      throw new InvalidCertificateFilterError('El estado del trámite no es válido');
    }
    const scope = await this.scope.resolve(requesterId);
    if (!(await this.periods.findById(filters.periodId))) throw new InvalidCertificateFilterError('El periodo no existe');
    const schoolIds = scope.kind === 'SCHOOLS' ? scope.schoolIds : undefined;
    // El alcance y la escuela pedida se combinan (intersección): pedir una escuela ajena no la abre.
    const wanted = filters.schoolId ? (schoolIds ? schoolIds.filter((id) => id === filters.schoolId) : [filters.schoolId]) : schoolIds;
    const data = await this.reader.read({ periodId: filters.periodId, ...(wanted && { schoolIds: wanted }) });
    const names = new Map((await this.schools.findAll()).map((s) => [s.id, s.name]));
    const text = filters.q ? fold(filters.q) : '';
    return buildTutorTeacherRows(data, names, this.now()).filter(
      (row) =>
        (!text || fold(row.tutorName).includes(text)) &&
        (!filters.status || row.acceptance === filters.status) &&
        (!filters.certificateStatus || (filters.certificateStatus === NO_CERTIFICATE ? row.certificateStatus === null : row.certificateStatus === filters.certificateStatus)),
    );
  }
}
