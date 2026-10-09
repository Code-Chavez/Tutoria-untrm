import { School } from '@domain/entities/School';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { EvaluationScaleCode } from '@domain/entities/TutorEvaluation';

const SCORE_VALUE: Record<EvaluationScaleCode, number> = { N: 1, CN: 2, AV: 3, CS: 4, S: 5 };

export interface IndicatorsReport {
  periodName: string;
  generatedAt: Date;
  students: { active: number; withTutor: number; withoutTutor: number; assignedPct: number };
  risk: {
    atRisk: number;
    atRiskPct: number;
    bySchool: { schoolId: string; schoolName: string; active: number; atRisk: number }[];
  };
  sessions: {
    individual: number;
    group: number;
    total: number;
    studentsServed: number;
    /** % de tutorados activos que participaron en al menos una sesión realizada. */
    coveragePct: number;
    byMonth: { month: string; individual: number; group: number }[];
  };
  referrals: {
    total: number;
    byService: { service: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
  /** Solo agregados: nunca por tutor ni por tutorado (anonimato, HU-37/39). */
  evaluation: { responses: number; averageScore: number | null };
  /** Filtros aplicados (HU-47), para rotular la pantalla y las exportaciones. */
  appliedFilters: string[];
}

export interface IndicatorsInput {
  /** Escuelas dentro del alcance del solicitante y de los filtros. */
  schools: School[];
  /** Tutorados activos ya acotados al alcance (escuelas y tutor). */
  students: Student[];
  /** Sesiones realizadas (no canceladas) del periodo. */
  sessions: SessionWithParticipants[];
  referrals: StudentReferral[];
  evaluationScores: EvaluationScaleCode[][];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round1((part / whole) * 100));
const countBy = <T>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(key(i), (map.get(key(i)) ?? 0) + 1));
  return [...map.entries()];
};

/**
 * Indicadores del tablero (HU-45), orientados a ICACIT/SINEACE: cobertura
 * de tutoría, riesgo, derivaciones por servicio y resultados de evaluación.
 * Todo se calcula al vuelo sobre lo ya registrado, acotado por el alcance
 * del solicitante y los filtros (facultad, escuela, tutor).
 */
export function buildIndicators(
  input: IndicatorsInput,
): Omit<IndicatorsReport, 'periodName' | 'generatedAt' | 'appliedFilters'> {
  const { students, sessions, referrals, evaluationScores } = input;
  const studentIds = new Set(students.map((s) => s.id));

  const withTutor = students.filter((s) => s.tutorId).length;
  const atRisk = students.filter((s) => s.isAtRisk).length;

  // Cuentan las sesiones en que asistió alguien del ámbito (A07), no las meramente programadas.
  const inScope = sessions.filter((s) => s.attendedStudentIds.some((id) => studentIds.has(id)));
  const individual = inScope.filter((s) => s.studentIds.length === 1).length;
  const served = new Set(inScope.flatMap((s) => s.attendedStudentIds).filter((id) => studentIds.has(id)));

  const months = new Map<string, { individual: number; group: number }>();
  for (const s of inScope) {
    const month = s.scheduledAt.toISOString().slice(0, 7);
    const entry = months.get(month) ?? { individual: 0, group: 0 };
    if (s.studentIds.length === 1) entry.individual += 1;
    else entry.group += 1;
    months.set(month, entry);
  }

  const scopedReferrals = referrals.filter((r) => studentIds.has(r.studentId));
  const scoreValues = evaluationScores.flatMap((scores) => scores.map((c) => SCORE_VALUE[c]));

  return {
    students: {
      active: students.length,
      withTutor,
      withoutTutor: students.length - withTutor,
      assignedPct: pct(withTutor, students.length),
    },
    risk: {
      atRisk,
      atRiskPct: pct(atRisk, students.length),
      bySchool: input.schools
        .map((school) => {
          const mine = students.filter((s) => s.schoolId === school.id);
          return {
            schoolId: school.id,
            schoolName: school.name,
            active: mine.length,
            atRisk: mine.filter((s) => s.isAtRisk).length,
          };
        })
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName)),
    },
    sessions: {
      individual,
      group: inScope.length - individual,
      total: inScope.length,
      studentsServed: served.size,
      coveragePct: pct(served.size, students.length),
      byMonth: [...months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, counts]) => ({ month, ...counts })),
    },
    referrals: {
      total: scopedReferrals.length,
      byService: countBy(scopedReferrals, (r) => r.service)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: countBy(scopedReferrals, (r) => r.status).map(([status, count]) => ({ status, count })),
    },
    evaluation: {
      responses: evaluationScores.length,
      averageScore:
        scoreValues.length === 0
          ? null
          : Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 100) / 100,
    },
  };
}
