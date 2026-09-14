import ExcelJS from 'exceljs';
import { ExcelStudentParser } from '@infrastructure/parsers/ExcelStudentParser';

async function buildWorkbook(headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Hoja1');
  sheet.addRow(headers);
  rows.forEach((r) => sheet.addRow(r));
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('ExcelStudentParser', () => {
  const parser = new ExcelStudentParser();

  it('genera una plantilla que puede volver a parsearse', async () => {
    const template = await parser.buildTemplate();
    const rows = await parser.parse(template);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      studentCode: '20191234',
      firstName: 'Ana María',
      lastName: 'Torres Ramos',
      cycle: '5',
      school: 'Ingeniería de Sistemas',
    });
  });

  it('mapea encabezados con acentos/mayúsculas y omite filas vacías', async () => {
    const buffer = await buildWorkbook(
      ['Código', 'Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Ciclo', 'Escuela Profesional'],
      [
        ['20191234', 'Ana', 'Torres', 'ana@untrm.edu.pe', '987654321', 5, 'Ingeniería de Sistemas'],
        ['', '', '', '', '', '', ''], // fila vacía → se omite
        ['20195678', 'Luis', 'Pérez', '', '', 3, 'Ingeniería Mecánica'],
      ],
    );

    const rows = await parser.parse(buffer);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ rowNumber: 2, studentCode: '20191234', cycle: '5' });
    expect(rows[1]).toMatchObject({ rowNumber: 4, studentCode: '20195678', firstName: 'Luis' });
  });

  it('devuelve vacío cuando no hay filas de datos', async () => {
    const buffer = await buildWorkbook(['codigo', 'nombres'], []);
    const rows = await parser.parse(buffer);
    expect(rows).toEqual([]);
  });
});
