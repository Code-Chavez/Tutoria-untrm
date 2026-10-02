import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { WorkPlanPage } from './WorkPlanPage';
import { workPlanService } from '../services/workPlanService';

vi.mock('../services/workPlanService', async () => {
  const actual = await vi.importActual<typeof import('../services/workPlanService')>(
    '../services/workPlanService',
  );
  return {
    ...actual,
    workPlanService: { getOverview: vi.fn(), getBySchool: vi.fn(), save: vi.fn() },
  };
});

const mocked = vi.mocked(workPlanService);

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <WorkPlanPage />
    </QueryClientTestWrapper>,
  );
}

describe('WorkPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('avisa si el usuario no tiene escuelas asignadas', async () => {
    mocked.getOverview.mockResolvedValue({ periodName: '2026-II', schools: [] });
    renderPage();
    expect(await screen.findByText('No tienes escuelas asignadas')).toBeInTheDocument();
  });

  it('con una sola escuela la carga sola y envía el plan con filas limpias', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: false }],
    });
    mocked.getBySchool.mockResolvedValue({ periodName: '2026-II', schoolName: 'Sistemas', plan: null });
    mocked.save.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('2.1 Denominación'), 'Taller de inducción');
    await user.click(screen.getByRole('tab', { name: 'Presupuesto' }));
    await user.click(screen.getByRole('button', { name: /Agregar fila/ }));
    await user.type(screen.getByLabelText('Cant. fila 1'), '2');
    await user.type(screen.getByLabelText('Costo unitario (S/) fila 1'), '10');
    // Fila de relleno vacía: no debe enviarse.
    await user.click(screen.getByRole('button', { name: /Agregar fila/ }));
    expect(screen.getAllByText('20.00', { selector: 'td' })).toHaveLength(2); // fila + total

    await user.click(screen.getByRole('button', { name: 'Guardar plan' }));

    await waitFor(() => expect(mocked.save).toHaveBeenCalled());
    const [schoolId, content] = mocked.save.mock.calls[0];
    expect(schoolId).toBe('s1');
    expect(content.denomination).toBe('Taller de inducción');
    expect(content.budget).toEqual([{ quantity: 2, type: '', resource: '', characteristics: '', unitCost: 10 }]);
    expect(content.operationalActivities).toHaveLength(7);
  });
});
