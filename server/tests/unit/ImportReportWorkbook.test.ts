import ExcelJS from 'exceljs';
import { ImportReportWorkbook } from '@infrastructure/parsers/ImportReportWorkbook';
import { ImportReport } from '@application/dtos/studentImport.dto';

describe('ImportReportWorkbook', () => {
  const builder = new ImportReportWorkbook();

  const report: ImportReport = {
    totalRows: 3,
    created: 2,
    continued: 1,
    skipped: 1,
    createdRows: [
      { row: 2, studentCode: '20191234', fullName: 'Ana Torres' },
      { row: 3, studentCode: '20195678', fullName: 'Luis Pérez' },
    ],
    continuedRows: [{ row: 5, studentCode: '20190001', fullName: 'Rosa Díaz' }],
    errors: [{ row: 4, studentCode: '123', message: 'Código inválido' }],
  };

  it('genera un .xlsx con las hojas Resumen, Registrados, Continúan y Rechazados', async () => {
    const buffer = await builder.build(report, {
      generatedBy: 'coord@untrm.edu.pe',
      generatedAt: new Date('2026-09-13T10:00:00Z'),
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.getWorksheet('Resumen')).toBeDefined();
    const created = workbook.getWorksheet('Registrados');
    const rejected = workbook.getWorksheet('Rechazados');

    // Encabezado + 2 registrados / + 1 rechazado.
    expect(created?.rowCount).toBe(3);
    expect(rejected?.rowCount).toBe(2);
    expect(created?.getRow(2).getCell(2).value).toBe('20191234');
    expect(rejected?.getRow(2).getCell(3).value).toBe('Código inválido');
    const continued = workbook.getWorksheet('Continúan');
    expect(continued?.rowCount).toBe(2);
    expect(continued?.getRow(2).getCell(2).value).toBe('20190001');
  });
});
