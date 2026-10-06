import PDFDocument from 'pdfkit';
import { BRAND, loadLogo } from './brand';

export interface PdfColumn {
  label: string;
  /** Peso relativo del ancho (por defecto 1). */
  weight?: number;
  align?: 'left' | 'right' | 'center';
}

export interface PdfOptions {
  title: string;
  subtitle?: string;
  landscape?: boolean;
  /** Fecha impresa en el pie; por defecto, ahora. */
  generatedAt?: Date;
}

export type PdfCell = string | number | null | undefined;

const TOP_MARGIN = 96;
const SIDE_MARGIN = 40;
const BOTTOM_MARGIN = 48;

/**
 * Documento PDF con la identidad UNTRM (HU-46): logotipo y colores en el
 * encabezado de cada página, pie con fecha y numeración, y utilidades para
 * secciones, pares clave-valor, listas y tablas con encabezado repetido.
 */
export class BrandedPdf {
  private readonly doc: PDFKit.PDFDocument;
  private readonly chunks: Buffer[] = [];
  private readonly generatedAt: Date;

  constructor(private readonly options: PdfOptions) {
    this.generatedAt = options.generatedAt ?? new Date();
    this.doc = new PDFDocument({
      size: 'A4',
      layout: options.landscape ? 'landscape' : 'portrait',
      bufferPages: true,
      margins: { top: TOP_MARGIN, bottom: BOTTOM_MARGIN, left: SIDE_MARGIN, right: SIDE_MARGIN },
    });
    this.doc.on('data', (chunk: Buffer) => this.chunks.push(chunk));
  }

  private get width(): number {
    return this.doc.page.width - SIDE_MARGIN * 2;
  }

  private ensureSpace(height: number): void {
    if (this.doc.y + height > this.doc.page.height - BOTTOM_MARGIN) this.doc.addPage();
  }

  heading(text: string): this {
    this.ensureSpace(40);
    this.doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).fillColor(BRAND.navy).text(text);
    this.doc
      .moveTo(SIDE_MARGIN, this.doc.y + 2)
      .lineTo(SIDE_MARGIN + this.width, this.doc.y + 2)
      .strokeColor(BRAND.blue)
      .lineWidth(0.8)
      .stroke();
    this.doc.moveDown(0.5).font('Helvetica').fillColor(BRAND.text).fontSize(10);
    return this;
  }

  paragraph(text: string): this {
    this.doc.font('Helvetica').fontSize(10).fillColor(BRAND.text).text(text || '—', { align: 'left' });
    this.doc.moveDown(0.4);
    return this;
  }

  note(text: string): this {
    this.doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(BRAND.muted).text(text);
    this.doc.font('Helvetica').moveDown(0.4);
    return this;
  }

  keyValues(pairs: [string, PdfCell][]): this {
    pairs.forEach(([label, value]) => {
      this.ensureSpace(16);
      this.doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.text).text(`${label}: `, { continued: true });
      this.doc.font('Helvetica').text(value === null || value === undefined || value === '' ? '—' : String(value));
    });
    this.doc.moveDown(0.4);
    return this;
  }

  bullets(items: string[]): this {
    items.forEach((item) => {
      this.ensureSpace(14);
      this.doc.font('Helvetica').fontSize(10).fillColor(BRAND.text).text(`• ${item}`, { indent: 8 });
    });
    this.doc.moveDown(0.4);
    return this;
  }

  /**
   * Tabla con encabezado azul repetido en cada página. Las filas listadas en
   * `emphasized` (subtotales, totales) se dibujan en negrita sobre fondo suave.
   */
  table(columns: PdfColumn[], rows: PdfCell[][], emphasized: ReadonlySet<number> = new Set()): this {
    const totalWeight = columns.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    const widths = columns.map((c) => ((c.weight ?? 1) / totalWeight) * this.width);

    const drawHeader = () => {
      this.ensureSpace(30);
      const y = this.doc.y;
      this.doc.rect(SIDE_MARGIN, y, this.width, 22).fill(BRAND.navy);
      let x = SIDE_MARGIN;
      this.doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      columns.forEach((c, i) => {
        this.doc.text(c.label, x + 4, y + 7, { width: widths[i] - 8, align: c.align ?? 'left', lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      this.doc.y = y + 22;
    };

    drawHeader();
    rows.forEach((row, index) => {
      const bold = emphasized.has(index);
      this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      const texts = columns.map((_, i) => (row[i] === null || row[i] === undefined || row[i] === '' ? '—' : String(row[i])));
      const height = Math.max(
        18,
        ...texts.map((t, i) => this.doc.heightOfString(t, { width: widths[i] - 8 }) + 8),
      );
      if (this.doc.y + height > this.doc.page.height - BOTTOM_MARGIN) {
        this.doc.addPage();
        drawHeader();
        this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      }
      const y = this.doc.y;
      if (bold) this.doc.rect(SIDE_MARGIN, y, this.width, height).fill(BRAND.band);
      let x = SIDE_MARGIN;
      this.doc.fillColor(BRAND.text);
      texts.forEach((t, i) => {
        this.doc.text(t, x + 4, y + 4, { width: widths[i] - 8, align: columns[i].align ?? 'left' });
        x += widths[i];
      });
      this.doc
        .moveTo(SIDE_MARGIN, y + height)
        .lineTo(SIDE_MARGIN + this.width, y + height)
        .strokeColor(BRAND.line)
        .lineWidth(0.5)
        .stroke();
      this.doc.y = y + height;
    });
    if (rows.length === 0) {
      this.doc.font('Helvetica-Oblique').fontSize(9).fillColor(BRAND.muted).text('Sin registros.', SIDE_MARGIN + 4, this.doc.y + 6);
      this.doc.moveDown(1);
    }
    this.doc.font('Helvetica').fillColor(BRAND.text).moveDown(0.8);
    return this;
  }

  signatureLine(label: string): this {
    this.ensureSpace(90);
    this.doc.moveDown(3);
    this.doc
      .moveTo(SIDE_MARGIN, this.doc.y)
      .lineTo(SIDE_MARGIN + 200, this.doc.y)
      .strokeColor(BRAND.text)
      .lineWidth(0.8)
      .stroke();
    this.doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(BRAND.text).text(label, SIDE_MARGIN);
    return this;
  }

  /** Cierra el documento: dibuja encabezado y pie en todas las páginas y devuelve el PDF. */
  toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => resolve(Buffer.concat(this.chunks)));
      this.doc.on('error', reject);
      this.decoratePages();
      this.doc.end();
    });
  }

  private decoratePages(): void {
    const range = this.doc.bufferedPageRange();
    const logo = loadLogo();
    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);
      const { width, height } = this.doc.page;
      // Se escribe dentro de los márgenes: se anulan para que pdfkit no añada páginas.
      const margins = { ...this.doc.page.margins };
      this.doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      this.doc.rect(0, 0, width, 6).fill(BRAND.navy);
      if (logo) this.doc.image(logo, SIDE_MARGIN, 16, { height: 44 });
      const textX = logo ? SIDE_MARGIN + 54 : SIDE_MARGIN;
      this.doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BRAND.navy)
        .text(BRAND.institution, textX, 20, { width: width - textX - SIDE_MARGIN, lineBreak: false });
      this.doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted)
        .text(BRAND.unit, textX, 34, { width: width - textX - SIDE_MARGIN, lineBreak: false });
      this.doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.blue)
        .text(this.options.title, textX, 47, { width: width - textX - SIDE_MARGIN, lineBreak: false });
      if (this.options.subtitle) {
        this.doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted)
          .text(this.options.subtitle, textX, 64, { width: width - textX - SIDE_MARGIN, lineBreak: false });
      }
      this.doc.moveTo(SIDE_MARGIN, 82).lineTo(width - SIDE_MARGIN, 82).strokeColor(BRAND.line).lineWidth(0.8).stroke();

      this.doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted)
        .text(`Generado el ${this.generatedAt.toLocaleString('es-PE')} · SIT UNTRM`, SIDE_MARGIN, height - 30, { lineBreak: false });
      this.doc.text(`Página ${i - range.start + 1} de ${range.count}`, width - SIDE_MARGIN - 100, height - 30, {
        width: 100,
        align: 'right',
        lineBreak: false,
      });

      this.doc.page.margins = margins;
    }
  }
}
