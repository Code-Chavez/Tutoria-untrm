import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: false, inForce: false, status: null }],
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

  it('editar un plan aprobado pide confirmar y lo guarda como nueva revisión (A12)', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: true, inForce: true, status: 'APROBADO' }],
    });
    mocked.getBySchool.mockResolvedValue({
      periodName: '2026-II',
      schoolName: 'Sistemas',
      plan: {
        id: 'wp1',
        status: 'APROBADO',
        revision: 1,
        inForce: true,
        resolution: { fileName: 'RD.pdf', fileSize: 1, uploadedAt: '2026-10-03T10:00:00Z' },
        denomination: 'Taller aprobado',
        specificObjectives: [],
        planning: [],
        programming: [],
        physicalResources: [],
        humanResources: [],
        budget: [],
        operationalActivities: [],
      } as never,
    });
    mocked.save.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Guardar como nueva revisión' }));
    expect(mocked.save).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Guardar revisión' }));
    await waitFor(() => expect(mocked.save).toHaveBeenCalled());
  });

  it('F3: al confirmar la revisión el diálogo sigue abierto y ocupado mientras se guarda, no se cancela ni se repite, y al terminar el foco vuelve al botón', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: true, inForce: true, status: 'APROBADO' }],
    });
    mocked.getBySchool.mockResolvedValue({
      periodName: '2026-II',
      schoolName: 'Sistemas',
      plan: {
        id: 'wp1',
        status: 'APROBADO',
        revision: 1,
        inForce: true,
        resolution: { fileName: 'RD.pdf', fileSize: 1, uploadedAt: '2026-10-03T10:00:00Z' },
        denomination: 'Taller aprobado',
        specificObjectives: [],
        planning: [],
        programming: [],
        physicalResources: [],
        humanResources: [],
        budget: [],
        operationalActivities: [],
      } as never,
    });
    let finish: (value: never) => void = () => undefined;
    mocked.save.mockReturnValue(new Promise((resolve) => (finish = resolve as (value: never) => void)));
    const user = userEvent.setup();
    renderPage();
    const opener = await screen.findByRole('button', { name: 'Guardar como nueva revisión' });

    await user.click(opener);
    const dialog = await screen.findByRole('alertdialog', { name: 'Crear una nueva revisión' });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar revisión' }));

    await waitFor(() => expect(mocked.save).toHaveBeenCalledTimes(1));
    // Con el guardado pendiente el diálogo NO se cierra: sigue ocupado y con el foco dentro.
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await user.keyboard('{Enter}');
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(mocked.save).toHaveBeenCalledTimes(1);

    finish({} as never);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados como nueva revisión');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar como nueva revisión' })).toHaveFocus());
  });
});
