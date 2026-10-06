import ExcelJS from 'exceljs';
import {
  ConsolidatedMetrics,
  ConsolidatedReport,
} from '@application/use-cases/consolidated-reports/buildConsolidatedReport';

const NAVY = 'FF0B1F3F';

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

// Construye el .xlsx del consolidado por escuela y facultad (HU-44). No
// persiste nada; recibe el reporte ya calculado.
export class ConsolidatedReportWorkbook {
  async build(report: ConsolidatedReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIT UNTRM';
    workbook.created = report.generatedAt;

    const sheet = workbook.addWorksheet('Consolidado');
    sheet.addRow([`Informe consolidado de tutoría · ${report.periodName}`]).font = {
      bold: true,
      size: 14,
      color: { argb: NAVY },
    };
    sheet.addRow([`Generado: ${report.generatedAt.toLocaleString('es-PE')}`]);
    sheet.addRow([]);

    const header = sheet.addRow(['Facultad', 'Escuela', ...CONSOLIDATED_COLUMNS.map((c) => c.label)]);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    });

    for (const faculty of report.faculties) {
      for (const school of faculty.schools) {
        sheet.addRow([faculty.facultyName, school.schoolName, ...CONSOLIDATED_COLUMNS.map((c) => c.value(school.metrics))]);
      }
      sheet.addRow([faculty.facultyName, 'Total facultad', ...CONSOLIDATED_COLUMNS.map((c) => c.value(faculty.metrics))]).font = { bold: true };
    }
    sheet.addRow(['TOTAL GENERAL', '', ...CONSOLIDATED_COLUMNS.map((c) => c.value(report.totals))]).font = { bold: true };

    sheet.getColumn(1).width = 34;
    sheet.getColumn(2).width = 32;
    for (let i = 3; i <= 2 + CONSOLIDATED_COLUMNS.length; i++) sheet.getColumn(i).width = 15;

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
