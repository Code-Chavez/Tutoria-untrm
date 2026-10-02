import { PrismaClient } from '@prisma/client';
import { TutorEvaluation, EvaluationScaleCode } from '@domain/entities/TutorEvaluation';
import {
  TutorEvaluationRepository,
  AnonymizedEvaluationScores,
  AnonymizedEvaluationScoresByTutor,
  AnonymizedEvaluationSuggestion,
  EvaluationStatisticsFilters,
  EvaluationSuggestionsFilters,
} from '@domain/repositories/TutorEvaluationRepository';

function toEvaluation(row: unknown): TutorEvaluation {
  const r = row as {
    id: string;
    studentId: string;
    tutorId: string;
    periodId: string;
    scores: string[];
    likes: string | null;
    dislikes: string | null;
    createdAt: Date;
  };
  return {
    id: r.id,
    studentId: r.studentId,
    tutorId: r.tutorId,
    periodId: r.periodId,
    scores: r.scores as EvaluationScaleCode[],
    likes: r.likes,
    dislikes: r.dislikes,
    createdAt: r.createdAt,
  };
}

export class PrismaTutorEvaluationRepository implements TutorEvaluationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<TutorEvaluation, 'id' | 'createdAt'>): Promise<TutorEvaluation> {
    const row = await this.prisma.tutorEvaluation.create({ data });
    return toEvaluation(row);
  }

  async findByStudentAndPeriod(studentId: string, periodId: string): Promise<TutorEvaluation | null> {
    const row = await this.prisma.tutorEvaluation.findUnique({
      where: { studentId_periodId: { studentId, periodId } },
    });
    return row ? toEvaluation(row) : null;
  }

  // HU-37: el `select` pide únicamente `scores` — studentId nunca sale de
  // esta consulta, no solo se omite después en el mapeo.
  async findAnonymizedScoresByTutorAndPeriod(
    tutorId: string,
    periodId: string,
  ): Promise<AnonymizedEvaluationScores[]> {
    const rows = await this.prisma.tutorEvaluation.findMany({
      where: { tutorId, periodId },
      select: { scores: true },
    });
    return rows.map((r) => ({ scores: r.scores as EvaluationScaleCode[] }));
  }

  // HU-39: el filtro por escuela/facultad se resuelve vía el tutorado en el
  // `where`, pero el `select` sigue sin pedir studentId — el anonimato no
  // se pierde al agregar el filtro.
  async findAnonymizedScoresByPeriod(
    periodId: string,
    filters?: EvaluationStatisticsFilters,
  ): Promise<AnonymizedEvaluationScoresByTutor[]> {
    const rows = await this.prisma.tutorEvaluation.findMany({
      where: {
        periodId,
        ...(filters?.schoolId || filters?.facultyId
          ? {
              student: {
                ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
                ...(filters.facultyId ? { school: { facultyId: filters.facultyId } } : {}),
              },
            }
          : {}),
      },
      select: { tutorId: true, scores: true },
    });
    return rows.map((r) => ({ tutorId: r.tutorId, scores: r.scores as EvaluationScaleCode[] }));
  }

  // HU-40: mismo criterio de anonimato — el `select` pide tutorId/likes/
  // dislikes, nunca studentId, con o sin filtro.
  async findAnonymizedSuggestionsByPeriod(
    periodId: string,
    filters?: EvaluationSuggestionsFilters,
  ): Promise<AnonymizedEvaluationSuggestion[]> {
    const rows = await this.prisma.tutorEvaluation.findMany({
      where: {
        periodId,
        ...(filters?.tutorId ? { tutorId: filters.tutorId } : {}),
        OR: [{ likes: { not: null } }, { dislikes: { not: null } }],
        ...(filters?.schoolId || filters?.facultyId
          ? {
              student: {
                ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
                ...(filters.facultyId ? { school: { facultyId: filters.facultyId } } : {}),
              },
            }
          : {}),
      },
      select: { tutorId: true, likes: true, dislikes: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows;
  }
}
