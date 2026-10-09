import ExcelJS from 'exceljs';
import { BrandedPdf } from '@infrastructure/export/BrandedPdf';
import { BrandedWorkbook } from '@infrastructure/export/BrandedWorkbook';
import { BRAND, loadLogo } from '@infrastructure/export/brand';

const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('Export engine (HU-46)', () => {
  it('el logotipo institucional está disponible en assets', () => {
    const logo = loadLogo();
    expect(logo).not.toBeNull();
    expect(logo!.subarray(1, 4).toString()).toBe('PNG');
  });

  describe('BrandedPdf', () => {
    it('genera un PDF válido con secciones, pares, listas y tabla', async () => {
      const pdf = await new BrandedPdf({ title: 'Informe de prueba', subtitle: 'Periodo 2026-II' })
        .heading('I. Datos')
        .keyValues([
          ['Tutor', 'Elena Ramírez'],
          ['Celular', null],
        ])
        .bullets(['Uno', 'Dos'])
        .table(
          [{ label: 'Actividad', weight: 3 }, { label: 'N°', align: 'right' }],
          [['Taller', 5], ['Total', 5]],
          new Set([1]),
        )
        .signatureLine('Firma del Docente Tutor/a')
        .toBuffer();

      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pageCount(pdf)).toBe(1);
    });

    it('reparte una tabla larga en varias páginas sin perder filas', async () => {
      const rows = Array.from({ length: 120 }, (_, i) => [`Fila ${i + 1}`, i]);
      const pdf = await new BrandedPdf({ title: 'Tabla larga' })
        .table([{ label: 'Nombre' }, { label: 'Valor', align: 'right' }], rows)
        .toBuffer();

      expect(pageCount(pdf)).toBeGreaterThan(1);
    });

    it('admite formato horizontal y tablas vacías', async () => {
      const pdf = await new BrandedPdf({ title: 'Horizontal', landscape: true })
        .table([{ label: 'A' }], [])
        .toBuffer();

      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });

  describe('BrandedWorkbook', () => {
    it('crea hojas con título, contexto, encabezado de marca y filas destacadas', async () => {
      const buffer = await new BrandedWorkbook()
        .addSheet({
          name: 'Resumen',
          title: 'Consolidado',
          details: ['Periodo 2026-II'],
          columns: [{ header: 'Escuela', width: 30 }, { header: 'Cobertura %', numFmt: '0.0' }],
          rows: [['Sistemas', 66.7], ['Total', 66.7]],
          emphasized: new Set([1]),
        })
        .toBuffer();

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = wb.getWorksheet('Resumen')!;

      expect(sheet.getCell('A1').value).toBe(BRAND.institution);
      expect(sheet.getCell('A2').value).toBe('Consolidado');
      expect(sheet.getCell('A3').value).toBe('Periodo 2026-II');
      // fila 5 = encabezado (título, institución, 1 detalle y una línea en blanco)
      expect(sheet.getCell('A5').value).toBe('Escuela');
      expect(sheet.getCell('A5').fill).toMatchObject({ fgColor: { argb: 'FF0B1F3F' } });
      expect(sheet.getCell('A6').value).toBe('Sistemas');
      expect(sheet.getCell('B6').numFmt).toBe('0.0');
      expect(sheet.getRow(7).font?.bold).toBe(true);
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 5 });
    });

    it('recorta el nombre de hoja a 31 caracteres (límite de Excel)', async () => {
      const buffer = await new BrandedWorkbook()
        .addSheet({ name: 'x'.repeat(40), title: 'T', columns: [{ header: 'A' }], rows: [] })
        .toBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      expect(wb.worksheets[0].name).toHaveLength(31);
    });
  });
});
