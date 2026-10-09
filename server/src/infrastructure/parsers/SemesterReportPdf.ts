import { SemesterReportRow } from '@domain/entities/TutorSemesterReport';
import { SemesterReportExport } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';
import { BrandedPdf, PdfColumn } from '../export/BrandedPdf';

const COLUMNS: PdfColumn[] = [
  { label: 'Actividades', weight: 3 },
  { label: 'Logros', weight: 2.5 },
  { label: 'Dificultades', weight: 2.5 },
  { label: 'Sugerencias', weight: 2.5 },
  { label: 'N° de participantes', weight: 1.3, align: 'right' },
];

const toRows = (rows: SemesterReportRow[]) =>
  rows.map((r) => [r.activity, r.achievements, r.difficulties, r.suggestions, r.participants]);

// PDF siguiendo la estructura del Anexo N° 9 del Protocolo de Tutoría
// (datos generales, tutorías individuales, grupales y firma) sobre el motor
// de exportación (HU-46). No persiste nada; recibe el informe ya guardado.
export class SemesterReportPdf {
  build({ report, tutorName, periodName }: SemesterReportExport): Promise<Buffer> {
    return new BrandedPdf({
      title: 'Informe de implementación de la tutoría semestral',
      subtitle: `Anexo N° 9 · Periodo ${periodName}`,
      generatedAt: report.updatedAt,
    })
      .heading('I. Datos generales')
      .keyValues([
        ['Nombre del tutor/a', tutorName],
        ['Programa de estudios', report.programName],
        ['Facultad', report.faculty],
        ['Categoría docente', report.teacherCategory],
        ['Ciclo/s de tutoría', report.tutoringCycles],
        ['Celular', report.phone],
      ])
      .heading('II. Desarrollo del proceso tutorial')
      .paragraph('2.1 Tutorías individuales')
      .table(COLUMNS, toRows(report.individual))
      .paragraph('2.2 Tutorías grupales')
      .table(COLUMNS, toRows(report.group))
      .paragraph('Atentamente,')
      .signatureLine('Firma del Docente Tutor/a')
      .toBuffer();
  }
}
