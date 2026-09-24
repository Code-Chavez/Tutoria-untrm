import ExcelJS from 'exceljs';
import { ImportStudentRow } from '@application/dtos/studentImport.dto';

type Field = 'studentCode' | 'firstName' | 'lastName' | 'email' | 'phone' | 'cycle' | 'school';

// Encabezados aceptados (normalizados) para cada campo del Anexo 3.
const HEADER_ALIASES: Record<string, Field> = {
  codigo: 'studentCode',
  'codigo universitario': 'studentCode',
  nombres: 'firstName',
  nombre: 'firstName',
  apellidos: 'lastName',
  apellido: 'lastName',
  correo: 'email',
  email: 'email',
  'correo electronico': 'email',
  telefono: 'phone',
  celular: 'phone',
  ciclo: 'cycle',
  escuela: 'school',
  'escuela profesional': 'school',
};

const TEMPLATE_COLUMNS: { header: string; field: Field; example: string }[] = [
  { header: 'codigo', field: 'studentCode', example: '20191234' },
  { header: 'nombres', field: 'firstName', example: 'Ana María' },
  { header: 'apellidos', field: 'lastName', example: 'Torres Ramos' },
  { header: 'correo', field: 'email', example: 'ana.torres@untrm.edu.pe' },
  { header: 'telefono', field: 'phone', example: '987654321' },
  { header: 'ciclo', field: 'cycle', example: '5' },
  { header: 'escuela', field: 'school', example: 'Ingeniería de Sistemas' },
];

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// exceljs devuelve valores heterogéneos (texto, número, hipervínculo, fórmula).
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((r) => r.text).join('').trim();
    if (obj.result !== undefined && obj.result !== null) return String(obj.result).trim();
  }
  return '';
}

export class ExcelStudentParser {
  async parse(buffer: Buffer): Promise<ImportStudentRow[]> {
    const workbook = new ExcelJS.Workbook();
    // @types/node 22 tipa Buffer como genérico; exceljs espera el Buffer clásico.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return [];
    }

    // Mapa columna → campo, a partir de la fila de encabezados.
    const headerRow = sheet.getRow(1);
    const columnField = new Map<number, Field>();
    headerRow.eachCell((cell, colNumber) => {
      const field = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
      if (field) columnField.set(colNumber, field);
    });

    const rows: ImportStudentRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const record: Partial<Record<Field, string>> = {};
      columnField.forEach((field, colNumber) => {
        record[field] = cellText(row.getCell(colNumber).value);
      });

      // Omite filas totalmente vacías.
      const hasContent = Object.values(record).some((v) => v && v.trim() !== '');
      if (!hasContent) continue;

      rows.push({
        rowNumber,
        studentCode: record.studentCode ?? '',
        firstName: record.firstName ?? '',
        lastName: record.lastName ?? '',
        email: record.email,
        phone: record.phone,
        cycle: record.cycle ?? '',
        school: record.school ?? '',
      });
    }

    return rows;
  }

  // Genera un .xlsx de plantilla con encabezados y una fila de ejemplo.
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIT UNTRM';
    const sheet = workbook.addWorksheet('Tutorados');

    sheet.columns = TEMPLATE_COLUMNS.map((col) => ({
      header: col.header,
      key: col.field,
      width: Math.max(col.header.length, col.example.length) + 4,
    }));

    // Estilo del encabezado.
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F3F' } };

    sheet.addRow(
      TEMPLATE_COLUMNS.reduce<Record<string, string>>((acc, col) => {
        acc[col.field] = col.example;
        return acc;
      }, {}),
    );

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
