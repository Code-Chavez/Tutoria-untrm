import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkImportPage } from './BulkImportPage';
import { studentService, type ImportReport } from '../services/studentService';

vi.mock('../services/studentService', () => ({
  studentService: {
    importStudents: vi.fn(),
    downloadTemplate: vi.fn(),
    downloadImportReport: vi.fn(),
  },
}));

const mocked = vi.mocked(studentService);

function xlsxFile(name = 'tutorados.xlsx') {
  return new File(['dummy'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('BulkImportPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rechaza archivos que no son .xlsx', async () => {
    render(<BulkImportPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const csv = new File(['x'], 'lista.csv', { type: 'text/csv' });
    // fireEvent.change fija los files directamente, sin el filtro accept de userEvent.
    Object.defineProperty(input, 'files', { value: [csv], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByText(/debe tener extensión \.xlsx/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importar estudiantes/i })).toBeDisabled();
  });

  it('importa y muestra el reporte con errores por fila', async () => {
    const report: ImportReport = {
      totalRows: 3,
      created: 2,
      skipped: 1,
      createdRows: [
        { row: 2, studentCode: '20191234', fullName: 'Ana Torres' },
        { row: 3, studentCode: '20195678', fullName: 'Luis Pérez' },
      ],
      errors: [{ row: 4, studentCode: '123', message: 'El código universitario debe tener entre 8 y 12 dígitos numéricos' }],
    };
    mocked.importStudents.mockResolvedValue(report);

    const user = userEvent.setup();
    render(<BulkImportPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, xlsxFile());
    await user.click(screen.getByRole('button', { name: /importar estudiantes/i }));

    await waitFor(() => expect(mocked.importStudents).toHaveBeenCalledTimes(1));
    // La tabla de errores muestra el número de fila y el código conflictivo.
    const errorsTable = await screen.findByRole('table');
    expect(within(errorsTable).getByText('4')).toBeInTheDocument();
    expect(within(errorsTable).getByText('123')).toBeInTheDocument();

    // HU-09: el resultado se puede exportar a Excel.
    await user.click(screen.getByRole('button', { name: /descargar reporte/i }));
    expect(mocked.downloadImportReport).toHaveBeenCalledWith(report);
  });

  it('descarga la plantilla', async () => {
    mocked.downloadTemplate.mockResolvedValue();
    const user = userEvent.setup();
    render(<BulkImportPage />);

    await user.click(screen.getByRole('button', { name: /descargar plantilla/i }));
    expect(mocked.downloadTemplate).toHaveBeenCalledTimes(1);
  });
});
