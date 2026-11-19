import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

async function fillRequired(user: ReturnType<typeof userEvent.setup>, denomination: string) {
  for (const [label, value] of [
    ['I. Introducción', 'Intro'], ['2.1 Denominación', denomination], ['2.2 Tipo de evento', 'Taller'], ['2.3 Fecha de ejecución', '2026-10-01'],
    ['2.4 Horario', '9:00'], ['2.5 Lugar', 'Aula 1'], ['2.6 Modalidad', 'Presencial'], ['2.7 Organizadores', 'Escuela'],
  ]) await user.type(await screen.findByLabelText(label), value);
  await user.click(screen.getByRole('tab', { name: 'Fundamentación y objetivos' }));
  for (const [label, value] of [
    ['III. Fundamentación', 'Base'], ['IV. Objetivo general', 'General'], ['Objetivo específico 1', 'Uno'], ['V. Público objetivo', 'Estudiantes'], ['VI. Metodología', 'Activa'],
  ]) await user.type(await screen.findByLabelText(label), value);
}

function renderPage() {
  return render(
    <MemoryRouter><QueryClientTestWrapper>
      <WorkPlanPage />
    </QueryClientTestWrapper></MemoryRouter>,
  );
}

// Un plan ya guardado tiene todos los campos obligatorios (el servidor los exige).
const filled = {
  introduction: 'Intro', denomination: 'Taller aprobado', eventType: 'Taller', executionDate: '2026-10-01', schedule: '9:00',
  place: 'Aula 1', modality: 'Presencial', organizers: 'Escuela', supportUnit: '', foundation: 'Base', generalObjective: 'General',
  specificObjectives: ['Uno'], targetAudience: 'Estudiantes', methodology: 'Activa',
};

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

    await fillRequired(user, 'Taller de inducción');
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
        ...filled,
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
        ...filled,
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

  it('H10: al guardar con un campo obligatorio vacío salta a su pestaña, lo marca y le da el foco, sin llamar al servidor', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: false, inForce: false, status: null }],
    });
    mocked.getBySchool.mockResolvedValue({ periodName: '2026-II', schoolName: 'Sistemas', plan: null });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Guardar plan' }));

    const field = await screen.findByLabelText('I. Introducción');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(field).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Falta completar «I. Introducción» (pestaña «Datos generales»)');
    expect(field).toHaveAccessibleDescription('Este campo es obligatorio.');
    expect(mocked.save).not.toHaveBeenCalled();

    // Al escribir en el campo, deja de marcarse.
    await user.type(field, 'Texto');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('H10: si lo que falta está en otra pestaña (objetivos), cambia a ella y marca el primer objetivo', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: false, inForce: false, status: null }],
    });
    mocked.getBySchool.mockResolvedValue({ periodName: '2026-II', schoolName: 'Sistemas', plan: null });
    const user = userEvent.setup();
    renderPage();

    // Con todo lo demás completo, el único vacío es el objetivo específico.
    await fillRequired(user, 'Taller');
    await user.clear(screen.getByLabelText('Objetivo específico 1'));
    await user.click(screen.getByRole('tab', { name: 'Presupuesto' }));
    await user.click(screen.getByRole('button', { name: 'Guardar plan' }));

    const objective = await screen.findByLabelText('Objetivo específico 1');
    expect(screen.getByRole('tab', { name: 'Fundamentación y objetivos' })).toHaveAttribute('aria-selected', 'true');
    expect(objective).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(objective).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent('Falta completar «Objetivos específicos»');
    expect(mocked.save).not.toHaveBeenCalled();
  });

  it('H10: con un plan aprobado incompleto avisa antes de pedir la confirmación de la revisión', async () => {
    mocked.getOverview.mockResolvedValue({
      periodName: '2026-II',
      schools: [{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: true, inForce: true, status: 'APROBADO' }],
    });
    mocked.getBySchool.mockResolvedValue({
      periodName: '2026-II',
      schoolName: 'Sistemas',
      plan: {
        id: 'wp1', status: 'APROBADO', revision: 1, inForce: true, resolution: null,
        ...filled, place: '', planning: [], programming: [], physicalResources: [], humanResources: [], budget: [], operationalActivities: [],
      } as never,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Guardar como nueva revisión' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('2.5 Lugar')).toHaveAttribute('aria-invalid', 'true');
    expect(mocked.save).not.toHaveBeenCalled();
  });
});
