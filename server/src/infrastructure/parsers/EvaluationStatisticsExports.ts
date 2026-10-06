import { EvaluationStatisticsReport } from '@application/dtos/evaluation.dto';
import { BrandedPdf } from '../export/BrandedPdf';
import { BrandedWorkbook } from '../export/BrandedWorkbook';

const round2 = (n: number) => Math.round(n * 100) / 100;

// Estadísticas de evaluación por tutor (HU-39) sobre el motor de exportación
// (HU-46). Solo agregados por tutor: nunca datos del tutorado que respondió.
export class EvaluationStatisticsPdf {
  build(report: EvaluationStatisticsReport): Promise<Buffer> {
    return new BrandedPdf({
      title: 'Resultados de la evaluación de tutoría',
      subtitle: `Anexo N° 7 · Periodo ${report.periodName} · escala 1 (Nunca) a 5 (Siempre)`,
    })
      .heading('Promedio por tutor')
      .table(
        [
          { label: 'Tutor', weight: 4 },
          { label: 'Respuestas', weight: 1, align: 'right' },
          { label: 'Promedio general', weight: 1.4, align: 'right' },
        ],
        report.tutors.map((t) => [t.tutorName, t.totalResponses, round2(t.overallAverage)]),
      )
      .note('Las respuestas son anónimas: solo se muestran promedios por tutor.')
      .toBuffer();
  }
}

export class EvaluationStatisticsWorkbook {
  build(report: EvaluationStatisticsReport): Promise<Buffer> {
    const details = [`Periodo ${report.periodName}`, 'Escala 1 (Nunca) a 5 (Siempre)'];
    const items = report.tutors[0]?.items ?? [];

    return new BrandedWorkbook()
      .addSheet({
        name: 'Promedios',
        title: 'Resultados de la evaluación de tutoría',
        details,
        columns: [
          { header: 'Tutor', width: 36 },
          { header: 'Respuestas', width: 13 },
          { header: 'Promedio general', width: 18, numFmt: '0.00' },
        ],
        rows: report.tutors.map((t) => [t.tutorName, t.totalResponses, round2(t.overallAverage)]),
      })
      .addSheet({
        name: 'Por ítem',
        title: 'Promedio por ítem del cuestionario',
        details,
        columns: [
          { header: 'Tutor', width: 36 },
          ...items.map((i) => ({ header: `Ítem ${i.code}`, width: 10, numFmt: '0.00' })),
        ],
        rows: report.tutors.map((t) => [t.tutorName, ...t.items.map((i) => round2(i.average))]),
      })
      .toBuffer();
  }
}
