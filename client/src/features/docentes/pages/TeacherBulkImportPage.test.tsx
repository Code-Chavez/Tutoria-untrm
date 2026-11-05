import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { TeacherBulkImportPage } from './TeacherBulkImportPage';
import { teacherImportService } from '../services/teacherImportService';

vi.mock('@features/pedidos/components/RequestListBanner', () => ({ RequestListBanner: () => null }));
vi.mock('../services/teacherImportService', () => ({ teacherImportService: { importTeachers: vi.fn(), downloadTemplate: vi.fn() } }));
const mocked = vi.mocked(teacherImportService);

const xlsx = (name = 'docentes.xlsx') => new File(['x'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const apiError = (message: string) => Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error: message } } });

const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientTestWrapper>
        <TeacherBulkImportPage />
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

const upload = async (file: File) => {
  const input = document.querySelector('input[type=file]') as HTMLInputElement;
  await userEvent.upload(input, file);
};

describe('TeacherBulkImportPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explica las columnas y deja descargar la plantilla; sin archivo no deja importar', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Carga masiva de docentes' })).toBeInTheDocument();
    expect(screen.getByText('escuela', { selector: 'code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar docentes' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Descargar plantilla/ }));
    expect(mocked.downloadTemplate).toHaveBeenCalled();
  });

  it('importa y muestra cuántos se crearon, las filas con error y qué sigue', async () => {
    mocked.importTeachers.mockResolvedValue({
      totalRows: 3,
      created: 2,
      skipped: 1,
      createdRows: [
        { row: 2, email: 'a@untrm.edu.pe', fullName: 'Ana Ruiz', school: 'Sistemas', emailSent: true },
        { row: 3, email: 'b@untrm.edu.pe', fullName: 'Beto Díaz', school: 'Sistemas', emailSent: true },
      ],
      errors: [{ row: 4, email: 'c@untrm.edu.pe', message: 'Ya existe una cuenta con ese correo' }],
    });
    renderPage();

    await upload(xlsx());
    await userEvent.click(screen.getByRole('button', { name: 'Importar docentes' }));

    await waitFor(() => expect(mocked.importTeachers).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Resultado de la carga' })).toBeInTheDocument();
    expect(screen.getByText('Docentes creados').previousElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Errores de validación (1)')).toBeInTheDocument();
    expect(screen.getByText('Ya existe una cuenta con ese correo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Asignar el tutor de cada ciclo/ })).toHaveAttribute('href', '/asignacion');
  });

  it('si el correo no salió, entrega el enlace de ese docente para llevárselo por otro medio', async () => {
    mocked.importTeachers.mockResolvedValue({
      totalRows: 1,
      created: 1,
      skipped: 0,
      createdRows: [{ row: 2, email: 'b@untrm.edu.pe', fullName: 'Beto Díaz', school: 'Sistemas', emailSent: false, invitationLink: 'https://x/activar-cuenta/zzz' }],
      errors: [],
    });
    renderPage();

    await upload(xlsx());
    await userEvent.click(screen.getByRole('button', { name: 'Importar docentes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el correo a 1 docente(s)');
    expect(screen.getByText('https://x/activar-cuenta/zzz')).toBeInTheDocument();
  });

  it('rechaza un archivo que no es .xlsx', async () => {
    renderPage();

    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File(['x'], 'docentes.csv', { type: 'text/csv' })] } });

    expect(await screen.findByText('El archivo debe tener extensión .xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar docentes' })).toBeDisabled();
  });

  it('muestra el motivo real si el servidor rechaza el archivo', async () => {
    mocked.importTeachers.mockRejectedValue(apiError('El archivo no contiene filas de datos'));
    renderPage();

    await upload(xlsx());
    await userEvent.click(screen.getByRole('button', { name: 'Importar docentes' }));

    expect(await screen.findByText('El archivo no contiene filas de datos')).toBeInTheDocument();
  });
});
