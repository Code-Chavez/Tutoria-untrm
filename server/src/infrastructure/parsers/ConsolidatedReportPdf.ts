import { ConsolidatedReport } from '@application/use-cases/consolidated-reports/buildConsolidatedReport';
import { BrandedPdf, PdfCell } from '../export/BrandedPdf';
import { CONSOLIDATED_COLUMNS } from './ConsolidatedReportWorkbook';

// PDF (horizontal) del consolidado por escuela y facultad (HU-44) sobre el
// motor de exportación (HU-46). No persiste nada; recibe el reporte ya calculado.
export class ConsolidatedReportPdf {
  build(report: ConsolidatedReport): Promise<Buffer> {
    const rows: PdfCell[][] = [];
    const emphasized = new Set<number>();
    const metrics = (m: Parameters<(typeof CONSOLIDATED_COLUMNS)[number]['value']>[0]) =>
      CONSOLIDATED_COLUMNS.map((c) => c.value(m));

    for (const faculty of report.faculties) {
      for (const school of faculty.schools) rows.push([school.schoolName, ...metrics(school.metrics)]);
      emphasized.add(rows.length);
      rows.push([`Total ${faculty.facultyName}`, ...metrics(faculty.metrics)]);
    }
    emphasized.add(rows.length);
    rows.push(['TOTAL GENERAL', ...metrics(report.totals)]);

    const pdf = new BrandedPdf({
      title: 'Informe consolidado de tutoría por escuela y facultad',
      subtitle: `Periodo ${report.periodName}`,
      landscape: true,
      generatedAt: report.generatedAt,
    });
    if (report.faculties.length === 0) {
      pdf.note('Sin datos para los filtros indicados.');
    } else {
      pdf.table(
        [
          { label: 'Escuela / facultad', weight: 4 },
          ...CONSOLIDATED_COLUMNS.map((c) => ({ label: c.label, align: 'right' as const })),
        ],
        rows,
        emphasized,
      );
    }
    return pdf.toBuffer();
  }
}
