import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutorImportDialog } from './TutorImportDialog';
import { tutorImportService } from '../services/userService';

vi.mock('../services/userService', () => ({ tutorImportService: { importTutors: vi.fn(), downloadTemplate: vi.fn() } }));
const mocked = vi.mocked(tutorImportService);

const file = new File(['x'], 'docentes.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

describe('TutorImportDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin archivo no deja importar; con archivo sube y muestra el resultado y las filas con error', async () => {
    mocked.importTutors.mockResolvedValue({
      totalRows: 3,
      created: 2,
      skipped: 1,
      createdRows: [
        { row: 2, email: 'a@untrm.edu.pe', fullName: 'Ana Ruiz', school: 'Sistemas', emailSent: true },
        { row: 3, email: 'b@untrm.edu.pe', fullName: 'Beto Díaz', school: 'Sistemas', emailSent: false, invitationLink: 'https://x/activar-cuenta/zzz' },
      ],
      errors: [{ row: 4, email: 'c@untrm.edu.pe', message: 'Ya existe una cuenta con ese correo' }],
    });
    render(<TutorImportDialog onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();
    await userEvent.upload(screen.getByLabelText('Archivo Excel (.xlsx)'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));

    await waitFor(() => expect(mocked.importTutors).toHaveBeenCalledWith(file));
    expect(await screen.findByRole('status')).toHaveTextContent('2 docente(s) creados, 1 fila(s) con error, de 3');
    expect(screen.getByRole('alert')).toHaveTextContent('https://x/activar-cuenta/zzz');
    expect(screen.getByLabelText('Filas con error')).toHaveTextContent('Fila 4 (c@untrm.edu.pe): Ya existe una cuenta con ese correo');
  });

  it('muestra el motivo real si el servidor rechaza el archivo', async () => {
    mocked.importTutors.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: 'El archivo no contiene filas de datos' } } }));
    render(<TutorImportDialog onClose={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Archivo Excel (.xlsx)'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo no contiene filas de datos');
  });

  it('descarga la plantilla', async () => {
    render(<TutorImportDialog onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Descargar la plantilla' }));

    expect(mocked.downloadTemplate).toHaveBeenCalled();
  });
});
