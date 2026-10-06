import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { ReportFilters } from './ReportFilters';
import { EMPTY_REPORT_FILTERS, ReportFilterValues, toFilterParams } from './reportFilterService';

vi.mock('./reportFilterService', async () => {
  const actual = await vi.importActual<typeof import('./reportFilterService')>('./reportFilterService');
  return {
    ...actual,
    reportFilterService: {
      getOptions: vi.fn().mockResolvedValue({
        periods: [{ id: 'p1', name: '2026-II', isActive: true }],
        faculties: [
          { id: 'f1', name: 'Ingeniería' },
          { id: 'f2', name: 'Salud' },
        ],
        schools: [
          { id: 'sc1', name: 'Sistemas', facultyId: 'f1' },
          { id: 'sc3', name: 'Enfermería', facultyId: 'f2' },
        ],
        cycles: [2, 4],
        tutors: [{ id: 't1', name: 'Elena Ramírez' }],
      }),
    },
  };
});

function Harness({ initial = EMPTY_REPORT_FILTERS }: { initial?: ReportFilterValues }) {
  const [value, setValue] = useState(initial);
  return (
    <QueryClientTestWrapper>
      <ReportFilters value={value} onChange={setValue} />
      <output data-testid="params">{JSON.stringify(toFilterParams(value))}</output>
    </QueryClientTestWrapper>
  );
}

describe('ReportFilters', () => {
  it('muestra los cinco controles con las opciones del alcance del rol', async () => {
    render(<Harness />);

    expect(await screen.findByRole('option', { name: 'Ciclo 4' })).toBeInTheDocument();
    ['Semestre', 'Facultad', 'Escuela Profesional', 'Ciclo', 'Tutor'].forEach((label) =>
      expect(screen.getByLabelText(label)).toBeInTheDocument(),
    );
    expect(screen.getByRole('option', { name: '2026-II (activo)' })).toBeInTheDocument();
  });

  it('convierte lo elegido en parámetros y omite los controles en "todos"', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByRole('option', { name: 'Ciclo 4' }); // las opciones cargan de forma asíncrona
    await user.selectOptions(screen.getByLabelText('Ciclo'), '4');
    await user.selectOptions(screen.getByLabelText('Tutor'), 't1');

    expect(JSON.parse(screen.getByTestId('params').textContent as string)).toEqual({ cycle: '4', tutorId: 't1' });
  });

  it('al cambiar de facultad descarta la escuela que ya no le pertenece', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ...EMPTY_REPORT_FILTERS, facultyId: 'f1', schoolId: 'sc1' }} />);
    await screen.findByRole('option', { name: 'Ciclo 4' });

    await user.selectOptions(screen.getByLabelText('Facultad'), 'f2');

    expect(JSON.parse(screen.getByTestId('params').textContent as string)).toEqual({ facultyId: 'f2' });
  });

  it('mantiene la escuela si pertenece a la facultad elegida', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ...EMPTY_REPORT_FILTERS, schoolId: 'sc1' }} />);
    await screen.findByRole('option', { name: 'Ciclo 4' });

    await user.selectOptions(screen.getByLabelText('Facultad'), 'f1');

    expect(JSON.parse(screen.getByTestId('params').textContent as string)).toEqual({
      facultyId: 'f1',
      schoolId: 'sc1',
    });
  });

  it('"Limpiar filtros" aparece solo con filtros activos y los restablece', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await screen.findByRole('option', { name: 'Ciclo 4' });
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Ciclo'), '2');
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(JSON.parse(screen.getByTestId('params').textContent as string)).toEqual({});
  });
});
