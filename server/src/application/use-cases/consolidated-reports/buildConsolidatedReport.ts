import { Faculty } from '@domain/entities/Faculty';
import { School } from '@domain/entities/School';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';

export interface ConsolidatedMetrics {
  activeStudents: number;
  studentsWithTutor: number;
  /** % de tutorados activos con tutor asignado (0-100). */
  coveragePct: number;
  tutors: number;
  sessionsIndividual: number;
  sessionsGroup: number;
  sessionsTotal: number;
  /** Tutorados distintos que participaron en al menos una sesión realizada. */
  participants: number;
  /** % de tutorados activos que participaron en alguna sesión (0-100). */
  participationPct: number;
  /** Tutores del ámbito que guardaron su informe semestral (HU-43). */
  reportsSubmitted: number;
  reportsPct: number;
  avgStudentsPerTutor: number;
  avgSessionsPerTutor: number;
}

export interface ConsolidatedSchoolRow {
  schoolId: string;
  schoolName: string;
  metrics: ConsolidatedMetrics;
}

export interface ConsolidatedFacultyRow {
  facultyId: string;
  facultyName: string;
  metrics: ConsolidatedMetrics;
  schools: ConsolidatedSchoolRow[];
}

export interface ConsolidatedReport {
  periodName: string;
  generatedAt: Date;
  totals: ConsolidatedMetrics;
  faculties: ConsolidatedFacultyRow[];
  /** Filtros aplicados (HU-47), para rotular la pantalla y las exportaciones. */
  appliedFilters: string[];
}

export interface ConsolidatedReportInput {
  schools: School[];
  faculties: Faculty[];
  students: Student[];
  /** Sesiones realizadas (no canceladas) dentro del periodo. */
  sessions: SessionWithParticipants[];
  /** Tutores con informe semestral guardado en el periodo. */
  reportTutorIds: Set<string>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round1((part / whole) * 100));
const avg = (part: number, whole: number) => (whole === 0 ? 0 : round1(part / whole));

/**
 * Consolidado por escuela y facultad (HU-44): se calcula al vuelo con lo ya
 * registrado. Cada nivel se recalcula desde los conjuntos de tutorados y
 * tutores (no suma filas de abajo) para que un tutor o una sesión grupal
 * que abarca varias escuelas no se cuente dos veces en los totales.
 */
export function buildConsolidatedReport(
  input: ConsolidatedReportInput,
): Omit<ConsolidatedReport, 'periodName' | 'generatedAt' | 'appliedFilters'> {
  const activeStudents = input.students.filter((s) => s.isActive);

  const metricsFor = (schoolIds: Set<string>): ConsolidatedMetrics => {
    const students = activeStudents.filter((s) => schoolIds.has(s.schoolId));
    const studentIds = new Set(students.map((s) => s.id));
    const withTutor = students.filter((s) => s.tutorId);
    const tutorIds = new Set(withTutor.map((s) => s.tutorId as string));

    const sessions = input.sessions.filter((s) => s.studentIds.some((id) => studentIds.has(id)));
    const sessionsIndividual = sessions.filter((s) => s.studentIds.length === 1).length;
    const sessionsGroup = sessions.length - sessionsIndividual;
    const participants = new Set(
      sessions.flatMap((s) => s.studentIds).filter((id) => studentIds.has(id)),
    );
    const reportsSubmitted = [...tutorIds].filter((id) => input.reportTutorIds.has(id)).length;

    return {
      activeStudents: students.length,
      studentsWithTutor: withTutor.length,
      coveragePct: pct(withTutor.length, students.length),
      tutors: tutorIds.size,
      sessionsIndividual,
      sessionsGroup,
      sessionsTotal: sessions.length,
      participants: participants.size,
      participationPct: pct(participants.size, students.length),
      reportsSubmitted,
      reportsPct: pct(reportsSubmitted, tutorIds.size),
      avgStudentsPerTutor: avg(withTutor.length, tutorIds.size),
      avgSessionsPerTutor: avg(sessions.length, tutorIds.size),
    };
  };

  const faculties = input.faculties
    .map((faculty) => {
      const schools = input.schools
        .filter((s) => s.facultyId === faculty.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ schoolId: s.id, schoolName: s.name, metrics: metricsFor(new Set([s.id])) }));
      return {
        facultyId: faculty.id,
        facultyName: faculty.name,
        metrics: metricsFor(new Set(schools.map((s) => s.schoolId))),
        schools,
      };
    })
    .filter((f) => f.schools.length > 0)
    .sort((a, b) => a.facultyName.localeCompare(b.facultyName));

  return { totals: metricsFor(new Set(input.schools.map((s) => s.id))), faculties };
}
