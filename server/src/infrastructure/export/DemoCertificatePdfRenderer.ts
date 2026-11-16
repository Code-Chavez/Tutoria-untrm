import type { CertificateVisuals } from '@application/use-cases/certification/CertificateVisualSettings';
import PDFDocument from 'pdfkit';
import { CertificatePdfRenderer } from '@application/ports/CertificatePdfRenderer';
import { CertificateText } from '@domain/certification/certificateDocument';

const NAVY = '#1d3f6e';
const GREY = '#555555';
const RED = '#be1e1e';
const PAGE = { width: 841.89, height: 595.28 }; // A4 horizontal
const SIDE = 60;

/**
 * Certificado de DEMOSTRACIÓN (corte 4): A4 horizontal, una sola página, con la disposición del ejemplo de la escuela. No usa las
 * franjas oficiales: dibuja marcadores si faltan los logotipos y conserva la marca de agua «DEMOSTRACIÓN — SIN VALOR»
 * cruzando la página. Cuando la institución entregue el formato oficial se cargará como plantilla vigente (Q24) y este
 * generador quedará solo como herramienta de prueba.
 */
export class DemoCertificatePdfRenderer implements CertificatePdfRenderer {
  render(text: CertificateText, visuals: CertificateVisuals = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Márgenes en cero: toda la colocación es explícita y ninguna línea puede abrir una segunda página.
      const doc = new PDFDocument({ size: [PAGE.width, PAGE.height], margin: 0, info: { Title: `Certificado de demostración ${text.numberLine}`, Subject: 'DEMOSTRACIÓN — SIN VALOR', Keywords: 'DEMO' } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.band(doc, 36);
      this.band(doc, PAGE.height - 56);
      if (visuals.watermark) {
        doc.save().opacity(0.09);
        doc.image(visuals.watermark, (PAGE.width - 290) / 2, 150, { fit: [290, 290], align: 'center', valign: 'center' });
        doc.restore();
      }
      const facultyX = PAGE.width - SIDE - 90;
      if (visuals.universityLogo) doc.image(visuals.universityLogo, SIDE + 20, 66, { fit: [250, 62], valign: 'center' });
      else this.logoPlaceholder(doc, SIDE + 20, 66, 250, 62, text.logoPlaceholders.left);
      if (visuals.facultyLogo) doc.image(visuals.facultyLogo, facultyX, 66, { fit: [70, 62], align: 'center', valign: 'center' });
      else this.logoPlaceholder(doc, facultyX, 66, 70, 62, text.logoPlaceholders.right);

      doc.font('Helvetica-Bold').fontSize(52).fillColor(NAVY).text(text.title, 0, 128, { width: PAGE.width, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(text.intro, SIDE + 50, 200, { width: PAGE.width - 2 * (SIDE + 50), lineGap: 3 });

      doc.font('Helvetica-Bold').fontSize(22).fillColor('#111111').text(text.name, SIDE + 50, 252, { width: PAGE.width - 2 * (SIDE + 50), align: 'center', lineBreak: false });
      doc.moveTo(SIDE + 50, 282).lineTo(PAGE.width - SIDE - 50, 282).lineWidth(0.6).strokeColor('#999999').stroke();

      this.body(doc, text, SIDE + 50, 294, PAGE.width - 2 * (SIDE + 50));

      doc.font('Helvetica').fontSize(11.5).fillColor('#222222').text(text.dateLine, SIDE + 50, 382, { width: PAGE.width - 2 * (SIDE + 50), align: 'right', lineBreak: false });
      if (visuals.signature) doc.image(visuals.signature, (PAGE.width - 165) / 2, 400, { fit: [165, 53], align: 'center', valign: 'center' });
      this.signature(doc, text.signatory);
      doc.font('Helvetica').fontSize(10).fillColor(GREY).text(text.numberLine, SIDE, PAGE.height - 36, { lineBreak: false });

      this.watermark(doc, text.watermark);
      doc.end();
    });
  }

  private band(doc: PDFKit.PDFDocument, y: number): void {
    doc.rect(SIDE - 15, y, PAGE.width - 2 * (SIDE - 15), 10).fillColor(NAVY).fill();
    doc.fillColor('#ffffff');
    for (let x = SIDE - 15 + 8; x < PAGE.width - SIDE; x += 18) doc.rect(x, y + 3, 6, 4).fill();
  }

  private logoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, label: string): void {
    doc.save().dash(4, { space: 3 }).lineWidth(1).strokeColor('#888888').rect(x, y, w, h).stroke().undash().restore();
    doc.font('Helvetica').fontSize(7.5).fillColor('#777777').text(label, x + 4, y + h / 2 - 4, { width: w - 8, align: 'center', lineBreak: false });
  }

  private body(doc: PDFKit.PDFDocument, text: CertificateText, x: number, y: number, width: number): void {
    doc.fontSize(11.5).fillColor('#222222');
    text.body.forEach((segment, index) => {
      doc.font(segment.bold ? 'Helvetica-Bold' : 'Helvetica');
      // El ancho de la columna se da solo en la primera llamada: en las continuaciones pdfkit lo contaría desde la posición actual y el texto
      // se saldría del margen derecho después de un tramo en negrita.
      const options = { align: 'left' as const, lineGap: 3, continued: index < text.body.length - 1 };
      if (index === 0) doc.text(segment.text, x, y, { ...options, width });
      else doc.text(segment.text, options);
    });
  }

  private signature(doc: PDFKit.PDFDocument, lines: string[]): void {
    const w = 340;
    const x = (PAGE.width - w) / 2;
    let y = 456;
    doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.6).strokeColor('#777777').stroke();
    y += 5;
    lines.forEach((line, index) => {
      doc.font(index === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(index === 0 ? 10 : 8.5).fillColor(GREY).text(line, x - 30, y, { width: w + 60, align: 'center', lineBreak: false });
      y += index === 0 ? 13 : 11;
    });
  }

  /** Marca de agua en diagonal, translúcida, encima de todo: un certificado de demostración no debe poder pasar por válido. */
  private watermark(doc: PDFKit.PDFDocument, label: string): void {
    doc.save();
    doc.rotate(-22, { origin: [PAGE.width / 2, PAGE.height / 2] });
    doc.fillColor(RED).fillOpacity(0.17).font('Helvetica-Bold').fontSize(56);
    const width = doc.widthOfString(label);
    doc.text(label, (PAGE.width - width) / 2, PAGE.height / 2 - 28, { lineBreak: false });
    doc.restore();
  }
}
