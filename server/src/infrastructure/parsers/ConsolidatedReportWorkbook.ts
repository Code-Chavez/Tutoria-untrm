import {
  ConsolidatedMetrics,
  ConsolidatedReport,
} from '@application/use-cases/consolidated-reports/buildConsolidatedReport';
import { BrandedWorkbook, SheetCell } from '../export/BrandedWorkbook';

export const CONSOLIDATED_COLUMNS: { label: string; value: (m: ConsolidatedMetrics) => number }[] = [
  { label: 'Tutorados', value: (m) => m.activeStudents },
  { label: 'Con tutor', value: (m) => m.studentsWithTutor },
  { label: 'Cobertura %', value: (m) => m.coveragePct },
  { label: 'Tutores', value: (m) => m.tutors },
  { label: 'Ses. individuales', value: (m) => m.sessionsIndividual },
  { label: 'Ses. grupales', value: (m) => m.sessionsGroup },
  { label: 'Participantes', value: (m) => m.participants },
  { label: 'Participación %', value: (m) => m.participationPct },
  { label: 'Informes', value: (m) => m.reportsSubmitted },
  { label: 'Informes %', value: (m) => m.reportsPct },
  { label: 'Tutorados/tutor', value: (m) => m.avgStudentsPerTutor },
  { label: 'Sesiones/tutor', value: (m) => m.avgSessionsPerTutor },
];

// Excel del consolidado por escuela y facultad (HU-44) sobre el motor de
// exportación (HU-46). No persiste nada; recibe el reporte ya calculado.
export class ConsolidatedReportWorkbook {
  build(report: ConsolidatedReport): Promise<Buffer> {
    const rows: SheetCell[][] = [];
    const emphasized = new Set<number>();
    const metrics = (m: ConsolidatedMetrics) => CONSOLIDATED_COLUMNS.map((c) => c.value(m));

    for (const faculty of report.faculties) {
      for (const school of faculty.schools) {
        rows.push([faculty.facultyName, school.schoolName, ...metrics(school.metrics)]);
      }
      emphasized.add(rows.length);
      rows.push([faculty.facultyName, 'Total facultad', ...metrics(faculty.metrics)]);
    }
    emphasized.add(rows.length);
    rows.push(['TOTAL GENERAL', '', ...metrics(report.totals)]);

    return new BrandedWorkbook(report.generatedAt)
      .addSheet({
        name: 'Consolidado',
        title: 'Informe consolidado de tutoría',
        details: [
          `Periodo ${report.periodName}`,
          ...(report.appliedFilters.length > 0 ? [`Filtros: ${report.appliedFilters.join(' · ')}`] : []),
          `Generado: ${report.generatedAt.toLocaleString('es-PE')}`,
        ],
        columns: [
          { header: 'Facultad', width: 34 },
          { header: 'Escuela', width: 32 },
          ...CONSOLIDATED_COLUMNS.map((c) => ({ header: c.label, width: 15 })),
        ],
        rows,
        emphasized,
      })
      .toBuffer();
  }
}
