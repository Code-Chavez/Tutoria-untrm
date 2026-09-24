import ExcelJS from 'exceljs';
import { ImportReport } from '@application/dtos/studentImport.dto';

export interface ImportReportMeta {
  generatedBy: string;
  generatedAt: Date;
}

const NAVY = 'FF0B1F3F';
const OK = 'FF1E7A46';
const DANGER = 'FFB42318';

function styleHeaderRow(row: ExcelJS.Row, argb: string): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// Construye un .xlsx con el resultado de una carga masiva: resumen + detalle
// de registrados y rechazados. No persiste nada; recibe el reporte ya calculado.
export class ImportReportWorkbook {
  async build(report: ImportReport, meta: ImportReportMeta): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIT UNTRM';
    workbook.created = meta.generatedAt;

    // ── Resumen ──────────────────────────────────────────────
    const summary = workbook.addWorksheet('Resumen');
    summary.columns = [{ width: 26 }, { width: 40 }];
    summary.addRow(['Reporte de carga masiva de estudiantes']).font = { bold: true, size: 14, color: { argb: NAVY } };
    summary.addRow([]);
    summary.addRow(['Generado por', meta.generatedBy]);
    summary.addRow(['Fecha', meta.generatedAt.toLocaleString('es-PE')]);
    summary.addRow(['Filas procesadas', report.totalRows]);
    summary.addRow(['Registrados', report.created]);
    summary.addRow(['Omitidos', report.skipped]);
    summary.getColumn(1).font = { bold: true };

    // ── Registrados ──────────────────────────────────────────
    const created = workbook.addWorksheet('Registrados');
    created.columns = [
      { header: 'Fila', key: 'row', width: 10 },
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Nombre', key: 'name', width: 40 },
    ];
    styleHeaderRow(created.getRow(1), OK);
    report.createdRows.forEach((r) => created.addRow({ row: r.row, code: r.studentCode, name: r.fullName }));

    // ── Rechazados ───────────────────────────────────────────
    const rejected = workbook.addWorksheet('Rechazados');
    rejected.columns = [
      { header: 'Fila', key: 'row', width: 10 },
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Motivo', key: 'reason', width: 60 },
    ];
    styleHeaderRow(rejected.getRow(1), DANGER);
    report.errors.forEach((e) => rejected.addRow({ row: e.row, code: e.studentCode ?? '', reason: e.message }));

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
