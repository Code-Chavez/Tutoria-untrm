import ExcelJS from 'exceljs';
import { BRAND } from './brand';

export interface SheetColumn {
  header: string;
  width?: number;
  /** Formato numérico de Excel (p. ej. '0.0' o '0.0"%"'). */
  numFmt?: string;
}

export type SheetCell = string | number | boolean | Date | null | undefined;

export interface SheetOptions {
  name: string;
  title: string;
  /** Líneas de contexto bajo el título (periodo, filtros, fecha...). */
  details?: string[];
  columns: SheetColumn[];
  rows: SheetCell[][];
  /** Índices (en `rows`) de filas de subtotal o total, que se resaltan en negrita. */
  emphasized?: ReadonlySet<number>;
}

const argb = (hex: string) => `FF${hex.replace('#', '')}`;

/**
 * Libro Excel con la identidad UNTRM (HU-46): cada hoja lleva título y
 * contexto, encabezado de tabla azul con filtro, fila fija y bordes tenues;
 * la estructura es tabular para poder reutilizarla en otras herramientas.
 */
export class BrandedWorkbook {
  private readonly workbook = new ExcelJS.Workbook();

  constructor(createdAt: Date = new Date()) {
    this.workbook.creator = 'SIT UNTRM';
    this.workbook.created = createdAt;
  }

  addSheet(options: SheetOptions): this {
    const sheet = this.workbook.addWorksheet(options.name.slice(0, 31));
    const lastColumn = Math.max(1, options.columns.length);

    sheet.addRow([BRAND.institution]).font = { bold: true, size: 11, color: { argb: argb(BRAND.navy) } };
    const title = sheet.addRow([options.title]);
    title.font = { bold: true, size: 15, color: { argb: argb(BRAND.blue) } };
    (options.details ?? []).forEach((line) => {
      sheet.addRow([line]).font = { size: 10, color: { argb: argb(BRAND.muted) } };
    });
    sheet.addRow([]);

    const headerRow = sheet.addRow(options.columns.map((c) => c.header));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.navy) } };
    });
    const headerIndex = headerRow.number;

    options.rows.forEach((values, index) => {
      const row = sheet.addRow(values);
      row.alignment = { vertical: 'top', wrapText: true };
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > lastColumn) return;
        cell.border = { bottom: { style: 'thin', color: { argb: argb(BRAND.line) } } };
        const fmt = options.columns[col - 1]?.numFmt;
        if (fmt) cell.numFmt = fmt;
      });
      if (options.emphasized?.has(index)) {
        row.font = { bold: true };
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          if (col <= lastColumn) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.band) } };
        });
      }
    });

    options.columns.forEach((c, i) => {
      sheet.getColumn(i + 1).width = c.width ?? 18;
    });
    sheet.views = [{ state: 'frozen', ySplit: headerIndex }];
    sheet.autoFilter = {
      from: { row: headerIndex, column: 1 },
      to: { row: headerIndex, column: lastColumn },
    };
    return this;
  }

  async toBuffer(): Promise<Buffer> {
    return Buffer.from(await this.workbook.xlsx.writeBuffer());
  }
}
