import ExcelJS from 'exceljs';
import { ImportTutorRow } from '@application/dtos/tutorImport.dto';
import { cellText, normalizeHeader } from './ExcelStudentParser';

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'school';

const HEADER_ALIASES: Record<string, Field> = {
  nombres: 'firstName',
  nombre: 'firstName',
  apellidos: 'lastName',
  apellido: 'lastName',
  correo: 'email',
  email: 'email',
  'correo electronico': 'email',
  'correo institucional': 'email',
  telefono: 'phone',
  celular: 'phone',
  escuela: 'school',
  'escuela profesional': 'school',
};

const TEMPLATE_COLUMNS: { header: string; field: Field; example: string }[] = [
  { header: 'nombres', field: 'firstName', example: 'Elena' },
  { header: 'apellidos', field: 'lastName', example: 'Ramírez Chávez' },
  { header: 'correo', field: 'email', example: 'elena.ramirez@untrm.edu.pe' },
  { header: 'telefono', field: 'phone', example: '941000003' },
  { header: 'escuela', field: 'school', example: 'Ingeniería de Sistemas' },
];

export class ExcelTutorParser {
  async parse(buffer: Buffer): Promise<ImportTutorRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) return [];

    const columnField = new Map<number, Field>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const field = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
      if (field) columnField.set(colNumber, field);
    });

    const rows: ImportTutorRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const record: Partial<Record<Field, string>> = {};
      columnField.forEach((field, colNumber) => {
        record[field] = cellText(row.getCell(colNumber).value);
      });
      if (!Object.values(record).some((v) => v && v.trim() !== '')) continue;
      rows.push({
        rowNumber,
        firstName: record.firstName ?? '',
        lastName: record.lastName ?? '',
        email: record.email ?? '',
        phone: record.phone,
        school: record.school ?? '',
      });
    }
    return rows;
  }

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIT UNTRM';
    const sheet = workbook.addWorksheet('Docentes tutores');
    sheet.columns = TEMPLATE_COLUMNS.map((col) => ({ header: col.header, key: col.field, width: Math.max(col.header.length, col.example.length) + 4 }));
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F3F' } };
    sheet.addRow(TEMPLATE_COLUMNS.reduce<Record<string, string>>((acc, col) => ({ ...acc, [col.field]: col.example }), {}));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
