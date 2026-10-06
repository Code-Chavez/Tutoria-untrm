import PDFDocument from 'pdfkit';
import { ConsolidatedReport } from '@application/use-cases/consolidated-reports/buildConsolidatedReport';
import { CONSOLIDATED_COLUMNS } from './ConsolidatedReportWorkbook';

const NAME_WIDTH = 150;
const NUM_WIDTH = 50;

// Construye el .pdf (horizontal) del consolidado por escuela y facultad
// (HU-44). No persiste nada; recibe el reporte ya calculado.
export class ConsolidatedReportPdf {
  build(report: ConsolidatedReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(15).text('Informe consolidado de tutoría por escuela y facultad');
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(`Periodo ${report.periodName} · Generado ${report.generatedAt.toLocaleString('es-PE')}`);
      doc.moveDown(1);

      this.header(doc);
      for (const faculty of report.faculties) {
        for (const school of faculty.schools) {
          this.row(doc, `${school.schoolName}`, CONSOLIDATED_COLUMNS.map((c) => c.value(school.metrics)), false);
        }
        this.row(doc, `Total ${faculty.facultyName}`, CONSOLIDATED_COLUMNS.map((c) => c.value(faculty.metrics)), true);
      }
      this.row(doc, 'TOTAL GENERAL', CONSOLIDATED_COLUMNS.map((c) => c.value(report.totals)), true);
      if (report.faculties.length === 0) {
        doc.fontSize(10).fillColor('#555').text('Sin datos para los filtros indicados.');
      }

      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.rect(x, y, NAME_WIDTH + NUM_WIDTH * CONSOLIDATED_COLUMNS.length, 26).fill('#0B1F3F');
    doc.fillColor('#fff').fontSize(7.5);
    doc.text('Escuela / facultad', x + 3, y + 8, { width: NAME_WIDTH - 6 });
    x += NAME_WIDTH;
    CONSOLIDATED_COLUMNS.forEach((c) => {
      doc.text(c.label, x + 2, y + 4, { width: NUM_WIDTH - 4, align: 'right' });
      x += NUM_WIDTH;
    });
    doc.y = y + 26;
    doc.fillColor('#000');
  }

  private row(doc: PDFKit.PDFDocument, name: string, values: number[], bold: boolean): void {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      this.header(doc);
    }
    const y = doc.y;
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(font).fontSize(8).fillColor('#000');
    const height = Math.max(16, doc.heightOfString(name, { width: NAME_WIDTH - 6 }) + 8);
    let x = doc.page.margins.left;
    doc.text(name, x + 3, y + 4, { width: NAME_WIDTH - 6 });
    x += NAME_WIDTH;
    values.forEach((v) => {
      doc.text(String(v), x + 2, y + 4, { width: NUM_WIDTH - 4, align: 'right' });
      x += NUM_WIDTH;
    });
    doc
      .moveTo(doc.page.margins.left, y + height)
      .lineTo(doc.page.margins.left + NAME_WIDTH + NUM_WIDTH * values.length, y + height)
      .strokeColor('#e0e0e0')
      .stroke();
    doc.y = y + height;
    doc.font('Helvetica');
  }
}
