import PDFDocument from 'pdfkit';
import { SemesterReportRow } from '@domain/entities/TutorSemesterReport';
import { SemesterReportExport } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';

const COLUMNS = [
  { label: 'Actividades', width: 130 },
  { label: 'Logros', width: 110 },
  { label: 'Dificultades', width: 110 },
  { label: 'Sugerencias', width: 110 },
  { label: 'N° de participantes', width: 55 },
] as const;

// Construye el .pdf siguiendo la estructura del Anexo N° 9 del Protocolo de
// Tutoría: datos generales, tutorías individuales, tutorías grupales y firma.
// No persiste nada; recibe el informe ya guardado por el tutor (HU-43).
export class SemesterReportPdf {
  build({ report, tutorName, periodName }: SemesterReportExport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(13).text('INFORME DE IMPLEMENTACIÓN DE LA TUTORÍA SEMESTRAL', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#555').text(`Anexo N° 9 · Periodo ${periodName}`, { align: 'center' });
      doc.moveDown(1);

      doc.fillColor('#000').fontSize(11).text('I. Datos generales');
      doc.moveDown(0.4).fontSize(10);
      const general: [string, string][] = [
        ['Nombre del tutor/a', tutorName],
        ['Programa de estudios', report.programName],
        ['Facultad', report.faculty],
        ['Categoría docente', report.teacherCategory],
        ['Ciclo/s de tutoría', report.tutoringCycles],
        ['Celular', report.phone],
      ];
      general.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value || '—');
      });
      doc.moveDown(1);

      doc.fontSize(11).text('II. Desarrollo del proceso tutorial');
      doc.moveDown(0.5);
      this.drawSection(doc, '2.1 Tutorías individuales', report.individual);
      this.drawSection(doc, '2.2 Tutorías grupales', report.group);

      if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();
      doc.moveDown(3);
      doc.fontSize(10).text('Atentamente,');
      doc.moveDown(3);
      const x = doc.page.margins.left;
      doc.moveTo(x, doc.y).lineTo(x + 200, doc.y).strokeColor('#000').stroke();
      doc.moveDown(0.3).text('Firma del Docente Tutor/a');

      doc.end();
    });
  }

  private drawSection(doc: PDFKit.PDFDocument, title: string, rows: SemesterReportRow[]): void {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(title);
    doc.font('Helvetica').moveDown(0.3);
    this.drawHeader(doc);
    if (rows.length === 0) {
      doc.fontSize(9).fillColor('#555').text('Sin registros.', doc.page.margins.left + 4, doc.y + 4);
      doc.moveDown(1);
    }
    rows.forEach((r) =>
      this.drawRow(doc, [r.activity, r.achievements, r.difficulties, r.suggestions, String(r.participants)]),
    );
    doc.moveDown(1);
  }

  private drawHeader(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.rect(x, y, COLUMNS.reduce((sum, c) => sum + c.width, 0), 22).fill('#0B1F3F');
    doc.fillColor('#fff').fontSize(8.5);
    COLUMNS.forEach((col) => {
      doc.text(col.label, x + 4, y + 5, { width: col.width - 8 });
      x += col.width;
    });
    doc.y = y + 22;
    doc.fillColor('#000');
  }

  private drawRow(doc: PDFKit.PDFDocument, values: string[]): void {
    const heights = COLUMNS.map((col, i) => doc.heightOfString(values[i] || ' ', { width: col.width - 8 }) + 8);
    const rowHeight = Math.max(18, ...heights);
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      this.drawHeader(doc);
    }
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.fontSize(8.5).fillColor('#000');
    COLUMNS.forEach((col, i) => {
      doc.text(values[i], x + 4, y + 4, { width: col.width - 8 });
      x += col.width;
    });
    doc
      .moveTo(doc.page.margins.left, y + rowHeight)
      .lineTo(doc.page.width - doc.page.margins.right, y + rowHeight)
      .strokeColor('#e0e0e0')
      .stroke();
    doc.y = y + rowHeight;
  }
}
