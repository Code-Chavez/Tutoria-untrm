import { SessionWithParticipants } from '@domain/entities/Session';
import { TutorFollowUp } from '@domain/entities/TutorFollowUp';
import {
  SemesterReportRow,
  TutorSemesterReportContent,
} from '@domain/entities/TutorSemesterReport';

export interface SemesterReportDraftInput {
  sessions: SessionWithParticipants[];
  followUps: TutorFollowUp[];
  programNames: string[];
  facultyNames: string[];
  cycles: number[];
  phone: string | null;
}

const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

/** Agrupa las sesiones por tema: una fila por tema con su nº de sesiones y participantes distintos. */
function rowsFromSessions(sessions: SessionWithParticipants[]): SemesterReportRow[] {
  const byTopic = new Map<string, { count: number; students: Set<string> }>();
  for (const s of sessions) {
    const entry = byTopic.get(s.topic) ?? { count: 0, students: new Set<string>() };
    entry.count += 1;
    s.studentIds.forEach((id) => entry.students.add(id));
    byTopic.set(s.topic, entry);
  }
  return [...byTopic.entries()].map(([topic, { count, students }]) => ({
    activity: `${topic} (${count} ${count === 1 ? 'sesión' : 'sesiones'})`,
    achievements: '',
    difficulties: '',
    suggestions: '',
    participants: students.size,
  }));
}

/**
 * Borrador autollenado del Anexo N°9 a partir de lo ya registrado (HU-43):
 * las sesiones realizadas dan actividades y participantes, separando las
 * individuales (1 tutorado) de las grupales; los seguimientos individuales
 * (Anexo N°5) aportan dificultades (motivos) y logros (acuerdos). Lo demás
 * (categoría, sugerencias) lo completa el tutor.
 */
export function buildSemesterReportDraft(input: SemesterReportDraftInput): TutorSemesterReportContent {
  const individualSessions = input.sessions.filter((s) => s.studentIds.length === 1);
  const groupSessions = input.sessions.filter((s) => s.studentIds.length > 1);

  const individual = rowsFromSessions(individualSessions);
  if (input.followUps.length > 0) {
    individual.push({
      activity: `Seguimiento individual (${input.followUps.length} ${input.followUps.length === 1 ? 'ficha' : 'fichas'})`,
      achievements: unique(input.followUps.map((f) => f.agreements)).join('; '),
      difficulties: unique(input.followUps.map((f) => f.reason)).join('; '),
      suggestions: '',
      participants: new Set(input.followUps.map((f) => f.studentId)).size,
    });
  }

  return {
    programName: unique(input.programNames).join(', '),
    faculty: unique(input.facultyNames).join(', '),
    teacherCategory: '',
    tutoringCycles: [...new Set(input.cycles)].sort((a, b) => a - b).join(', '),
    phone: input.phone ?? '',
    individual,
    group: rowsFromSessions(groupSessions),
  };
}
