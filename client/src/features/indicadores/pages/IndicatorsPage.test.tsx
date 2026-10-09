import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { IndicatorsPage } from './IndicatorsPage';
import { indicatorsService } from '../services/indicatorsService';
import type { IndicatorsReport } from '../services/indicatorsService';

vi.mock('../services/indicatorsService', () => ({ indicatorsService: { getIndicators: vi.fn() } }));


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

const mocked = vi.mocked(indicatorsService);

const report: IndicatorsReport = {
  periodName: '2026-II',
  generatedAt: '2026-10-06T10:00:00Z',
  students: { active: 40, withTutor: 30, withoutTutor: 10, assignedPct: 75 },
  risk: {
    atRisk: 8,
    atRiskPct: 20,
    bySchool: [{ schoolId: 'sc1', schoolName: 'Sistemas', active: 25, atRisk: 5 }],
  },
  sessions: {
    individual: 12,
    group: 3,
    total: 15,
    studentsServed: 24,
    coveragePct: 60,
    byMonth: [{ month: '2026-09', individual: 12, group: 3 }],
  },
  referrals: {
    total: 6,
    byService: [{ service: 'PSICOLOGIA', count: 4 }],
    byStatus: [{ status: 'ENVIADO', count: 6 }],
  },
  evaluation: { responses: 9, averageScore: 4.25 },
  appliedFilters: [],
};

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <IndicatorsPage />
    </QueryClientTestWrapper>,
  );
}

describe('IndicatorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getIndicators.mockResolvedValue(report);
  });

  it('muestra los indicadores clave y los gráficos', async () => {
    renderPage();

    expect(await screen.findByText('Tutorados activos')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument(); // cobertura de sesiones
    expect(screen.getByText('20%')).toBeInTheDocument(); // riesgo
    expect(screen.getByText('4.25 / 5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sep: 12 y 3' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Psicología: 4' })).toBeInTheDocument();
    expect(screen.getByText('5/25')).toBeInTheDocument();
  });

  it('muestra un guion si aún no hay respuestas de evaluación', async () => {
    mocked.getIndicators.mockResolvedValue({
      ...report,
      evaluation: { responses: 0, averageScore: null },
    });
    renderPage();

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('al elegir un tutor vuelve a consultar con ese filtro', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tutorados activos');

    await screen.findByRole('option', { name: 'Elena Ramírez' });
    await user.selectOptions(screen.getByLabelText('Tutor'), 't1');

    await waitFor(() =>
      expect(mocked.getIndicators).toHaveBeenLastCalledWith({
        periodId: undefined,
        facultyId: undefined,
        schoolId: undefined,
        cycle: undefined,
        tutorId: 't1',
      }),
    );
  });

  it('ofrece reintentar si falla la carga', async () => {
    mocked.getIndicators.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText('No se pudieron cargar los indicadores')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
