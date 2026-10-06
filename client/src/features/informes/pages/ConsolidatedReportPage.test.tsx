import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { ConsolidatedReportPage } from './ConsolidatedReportPage';
import { consolidatedReportService } from '../services/consolidatedReportService';
import type { ConsolidatedMetrics, ConsolidatedReport } from '../services/consolidatedReportService';

vi.mock('../services/consolidatedReportService', async () => {
  const actual = await vi.importActual<typeof import('../services/consolidatedReportService')>(
    '../services/consolidatedReportService',
  );
  return { ...actual, consolidatedReportService: { getReport: vi.fn(), download: vi.fn() } };
});


vi.mock('@shared/reportFilters/reportFilterService', async () => {
  const actual = await vi.importActual<typeof import('@shared/reportFilters/reportFilterService')>(
    '@shared/reportFilters/reportFilterService',
  );
  return {
    ...actual,
    reportFilterService: {
      getOptions: vi.fn().mockResolvedValue({
        periods: [
          { id: 'p1', name: '2026-II', isActive: true },
          { id: 'p0', name: '2026-I', isActive: false },
        ],
        faculties: [
          { id: 'f1', name: 'Ingeniería' },
          { id: 'f2', name: 'Salud' },
        ],
        schools: [
          { id: 'sc1', name: 'Sistemas', facultyId: 'f1' },
          { id: 'sc3', name: 'Enfermería', facultyId: 'f2' },
        ],
        cycles: [1, 3],
        tutors: [{ id: 't1', name: 'Elena Ramírez' }],
      }),
    },
  };
});

const mocked = vi.mocked(consolidatedReportService);

const metrics = (over: Partial<ConsolidatedMetrics> = {}): ConsolidatedMetrics => ({
  activeStudents: 10,
  studentsWithTutor: 8,
  coveragePct: 80,
  tutors: 2,
  sessionsIndividual: 5,
  sessionsGroup: 1,
  sessionsTotal: 6,
  participants: 7,
  participationPct: 70,
  reportsSubmitted: 1,
  reportsPct: 50,
  avgStudentsPerTutor: 4,
  avgSessionsPerTutor: 3,
  ...over,
});

const report: ConsolidatedReport = {
  periodName: '2026-II',
  generatedAt: '2026-10-05T10:00:00Z',
  totals: metrics({ activeStudents: 99 }),
  faculties: [
    {
      facultyId: 'f1',
      facultyName: 'Ingeniería',
      metrics: metrics({ activeStudents: 50 }),
      schools: [{ schoolId: 'sc1', schoolName: 'Sistemas', metrics: metrics() }],
    },
  ],
  appliedFilters: [],
};

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <ConsolidatedReportPage />
    </QueryClientTestWrapper>,
  );
}

describe('ConsolidatedReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getReport.mockResolvedValue(report);
  });

  it('muestra escuelas, subtotal por facultad y total general', async () => {
    renderPage();

    expect(await screen.findByRole('cell', { name: 'Sistemas' })).toBeInTheDocument();
    expect(screen.getByText('Total Ingeniería')).toBeInTheDocument();
    expect(screen.getByText('Total general')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  });

  it('al combinar semestre, facultad y ciclo consulta con todos los filtros, sin recargar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('cell', { name: 'Sistemas' });

    await screen.findByRole('option', { name: 'Ciclo 3' }); // las opciones cargan de forma asíncrona
    await user.selectOptions(screen.getByLabelText('Semestre'), 'p0');
    await user.selectOptions(screen.getByLabelText('Facultad'), 'f2');
    await user.selectOptions(screen.getByLabelText('Ciclo'), '3');

    await waitFor(() =>
      expect(mocked.getReport).toHaveBeenLastCalledWith({
        periodId: 'p0',
        facultyId: 'f2',
        schoolId: undefined,
        cycle: '3',
        tutorId: undefined,
      }),
    );
    // La escuela se limita a la facultad elegida.
    const schoolSelect = screen.getByLabelText('Escuela Profesional');
    expect(schoolSelect).toHaveTextContent('Enfermería');
    expect(schoolSelect).not.toHaveTextContent('Sistemas');
  });

  it('"Limpiar filtros" restablece todos los controles', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('cell', { name: 'Sistemas' });

    await screen.findByRole('option', { name: 'Ciclo 1' });
    await user.selectOptions(screen.getByLabelText('Ciclo'), '1');
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(screen.getByLabelText('Ciclo')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('las exportaciones reutilizan los filtros elegidos', async () => {
    mocked.download.mockResolvedValue();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('cell', { name: 'Sistemas' });

    await screen.findByRole('option', { name: 'Ciclo 3' });
    await user.selectOptions(screen.getByLabelText('Ciclo'), '3');
    await user.click(screen.getByRole('button', { name: /Excel/ }));

    expect(mocked.download).toHaveBeenCalledWith('excel', expect.objectContaining({ cycle: '3' }));
  });

  it('exporta a Excel y PDF con los filtros vigentes', async () => {
    mocked.download.mockResolvedValue();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('cell', { name: 'Sistemas' });

    await user.click(screen.getByRole('button', { name: /Excel/ }));
    await user.click(screen.getByRole('button', { name: /PDF/ }));

    expect(mocked.download).toHaveBeenNthCalledWith(1, 'excel', expect.objectContaining({ cycle: undefined }));
    expect(mocked.download).toHaveBeenNthCalledWith(2, 'pdf', expect.objectContaining({ cycle: undefined }));
  });
});
