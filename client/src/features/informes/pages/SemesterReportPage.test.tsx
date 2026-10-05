import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { SemesterReportPage } from './SemesterReportPage';
import { semesterReportService } from '../services/semesterReportService';
import type { MySemesterReportView } from '../services/semesterReportService';

vi.mock('../services/semesterReportService', async () => {
  const actual = await vi.importActual<typeof import('../services/semesterReportService')>(
    '../services/semesterReportService',
  );
  return {
    ...actual,
    semesterReportService: { getMine: vi.fn(), saveMine: vi.fn(), downloadPdf: vi.fn() },
  };
});

const mocked = vi.mocked(semesterReportService);

const draft = {
  programName: 'Ing. de Sistemas',
  faculty: 'Facultad de Ingeniería',
  teacherCategory: '',
  tutoringCycles: '1, 3',
  phone: '941000003',
  individual: [
    {
      activity: 'Hábitos de estudio (2 sesiones)',
      achievements: '',
      difficulties: '',
      suggestions: '',
      participants: 2,
    },
  ],
  group: [],
};

const view = (report: MySemesterReportView['report'] = null): MySemesterReportView => ({
  periodName: '2026-II',
  tutorName: 'Elena Ramírez',
  report,
  draft,
});

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <SemesterReportPage />
    </QueryClientTestWrapper>,
  );
}

describe('SemesterReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el borrador autollenado y bloquea exportar hasta guardar', async () => {
    mocked.getMine.mockResolvedValue(view());
    renderPage();

    expect(await screen.findByLabelText('Programa de estudios')).toHaveValue('Ing. de Sistemas');
    expect(screen.getByLabelText('2.1 Tutorías individuales Actividades fila 1')).toHaveValue(
      'Hábitos de estudio (2 sesiones)',
    );
    expect(screen.getByRole('button', { name: /Exportar PDF/ })).toBeDisabled();
  });

  it('guarda lo editado y descarta filas vacías', async () => {
    mocked.getMine.mockResolvedValue(view());
    mocked.saveMine.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Categoría docente'), 'Asociado');
    await user.type(
      screen.getByLabelText('2.1 Tutorías individuales Logros fila 1'),
      'Mejoró la asistencia',
    );
    await user.click(screen.getAllByRole('button', { name: /Agregar fila/ })[1]); // fila vacía en grupales
    await user.click(screen.getByRole('button', { name: 'Guardar informe' }));

    await waitFor(() => expect(mocked.saveMine).toHaveBeenCalled());
    const content = mocked.saveMine.mock.calls[0][0];
    expect(content.teacherCategory).toBe('Asociado');
    expect(content.individual[0]).toMatchObject({
      achievements: 'Mejoró la asistencia',
      participants: 2,
    });
    expect(content.group).toEqual([]);
  });

  it('con informe guardado permite exportar y "Volver a autollenar" restaura el borrador', async () => {
    mocked.getMine.mockResolvedValue(
      view({ ...draft, id: 'r1', periodId: 'p1', tutorId: 't1', updatedAt: '', teacherCategory: 'Principal' }),
    );
    mocked.downloadPdf.mockResolvedValue();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByLabelText('Categoría docente')).toHaveValue('Principal');
    await user.click(screen.getByRole('button', { name: /Exportar PDF/ }));
    expect(mocked.downloadPdf).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Volver a autollenar' }));
    expect(screen.getByLabelText('Categoría docente')).toHaveValue('');
  });
});
