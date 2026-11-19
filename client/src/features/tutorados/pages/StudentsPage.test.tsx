import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { StudentsPage } from './StudentsPage';
import type { Student } from '../services/studentService';

// El estado de la lista (filtros, página y la ventana abierta con su estudiante) vive en la URL.
let mockRole = 'Coordinador';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', role: mockRole, firstName: 'C', lastName: 'D' } }) }));
vi.mock('@features/admin/services/roleService', () => ({ roleService: { getRoles: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/admin/services/userService', () => ({ userService: { getUsers: vi.fn().mockResolvedValue([]) } }));

const student = (over: Partial<Student>): Student => ({ id: 's1', studentCode: '20240001', firstName: 'Ana', lastName: 'Ruiz', cycle: 3, isAtRisk: false, isActive: true, schoolId: 'sch1', tutorId: null, ...over });
const students = [student({}), student({ id: 's2', studentCode: '20240002', firstName: 'Luis', lastName: 'Pérez', cycle: 5 })];
const periods = [
  { id: 'p1', name: '2026-II', isActive: true },
  { id: 'p0', name: '2026-I', isActive: false },
];
const hookState = vi.hoisted(() => ({ students: [] as unknown[], periods: [] as unknown[], periodsError: false, retryPeriods: undefined as unknown as () => void, calls: [] as unknown[][] }));
vi.mock('../hooks/useStudents', () => ({
  useStudents: (...args: unknown[]) => {
    hookState.calls.push(args);
    return {
      students: hookState.students, periods: hookState.periods, periodsError: hookState.periodsError, retryPeriods: hookState.retryPeriods,
      schools: [{ id: 'sch1', name: 'Sistemas', facultyId: 'f1', isActive: true }], tutors: [], loading: false, error: false, refresh: vi.fn(),
    };
  },
}));

function Where() {
  const { search } = useLocation();
  return <span aria-label="url">{search}</span>;
}

const renderPage = (url = '/tutorados') =>
  render(
    <QueryClientTestWrapper>
      <MemoryRouter initialEntries={[url]}>
        <StudentsPage />
        <Where />
      </MemoryRouter>
    </QueryClientTestWrapper>,
  );

describe('StudentsPage: el estado de la lista vive en la URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockRole = 'Coordinador';
    hookState.students = students;
    hookState.periods = periods;
    hookState.periodsError = false;
    hookState.retryPeriods = vi.fn();
    hookState.calls = [];
  });

  it('recargar con una ficha abierta la reabre con lo que se había escrito', async () => {
    const user = userEvent.setup();
    const first = renderPage('/tutorados?dialogo=seguimiento&estudiante=s1');
    await user.type(await screen.findByLabelText(/motivo de seguimiento/i), 'Faltas reiteradas');
    first.unmount();

    renderPage('/tutorados?dialogo=seguimiento&estudiante=s1');
    expect(await screen.findByLabelText(/motivo de seguimiento/i)).toHaveValue('Faltas reiteradas');
    expect(screen.getByRole('status')).toHaveTextContent(/recuperamos/i);
  });

  it('los filtros salen de la URL y escribirlos la actualiza sin perder los demás', async () => {
    const user = userEvent.setup();
    renderPage('/tutorados?q=luis&ciclo=5');
    expect(await screen.findByText('Pérez', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Ruiz', { exact: false })).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Buscar estudiante' });
    expect(search).toHaveValue('luis');

    await user.clear(search);
    await user.type(search, 'ana');
    expect(screen.getByLabelText('url')).toHaveTextContent('q=ana');
    expect(screen.getByLabelText('url')).toHaveTextContent('ciclo=5');
  });

  it('con un semestre elegido rotula escuela y tutor como actuales y avisa de que solo el ciclo es del semestre; sin semestre no cambia nada', async () => {
    const first = renderPage('/tutorados?periodo=p1');
    expect(await screen.findByRole('columnheader', { name: 'Escuela profesional (actual)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tutor (actual)' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/el ciclo es el de la matrícula en ese semestre; la escuela y el tutor son los actuales/);
    first.unmount();

    renderPage();
    expect(await screen.findByRole('columnheader', { name: 'Escuela profesional' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tutor' })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('abrir «Editar estudiante» pone la ventana y el estudiante en la URL; cerrarla los quita', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click((await screen.findAllByRole('button', { name: 'Editar estudiante' }))[0]!);
    expect(screen.getByLabelText('url')).toHaveTextContent('dialogo=editar');
    expect(screen.getByLabelText('url')).toHaveTextContent('estudiante=s1');
    expect(await screen.findByRole('heading', { name: 'Editar estudiante' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByLabelText('url')).toBeEmptyDOMElement();
  });

  it('un enlace con la ventana y el estudiante la abre al cargar (también las de riesgo y las nuevas)', async () => {
    const first = renderPage('/tutorados?dialogo=riesgo&estudiante=s2');
    expect(await screen.findByRole('dialog', { name: 'Marcar en riesgo académico' })).toBeInTheDocument();
    first.unmount();

    renderPage('/tutorados?dialogo=nuevo');
    expect(await screen.findByRole('heading', { name: 'Nuevo estudiante' })).toBeInTheDocument();
  });

  it('un enlace a un estudiante que no existe no deja ventana abierta y limpia la URL', async () => {
    renderPage('/tutorados?dialogo=editar&estudiante=nada&q=ana');
    await screen.findByText('Ruiz', { exact: false });
    await vi.waitFor(() => expect(screen.getByLabelText('url')).toHaveTextContent(/^\?q=ana$/));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el modo «elegir estudiante» del menú conserva los filtros al salir de él', async () => {
    mockRole = 'Docente Tutor';
    const user = userEvent.setup();
    renderPage('/tutorados?accion=entrevista&q=ana');
    await screen.findByText('Ruiz', { exact: false });
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('url')).toHaveTextContent(/^\?q=ana$/);
  });
});

describe('StudentsPage: filtro por periodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockRole = 'Coordinador';
    hookState.students = students;
    hookState.periods = periods;
    hookState.periodsError = false;
    hookState.retryPeriods = vi.fn();
    hookState.calls = [];
  });

  it('sin periodo en la URL pide la lista de siempre y ofrece «Todos los periodos»', async () => {
    renderPage();
    const select = await screen.findByRole('combobox', { name: 'Filtrar por periodo' });
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Todos los periodos' })).toBeInTheDocument();
    expect(hookState.calls.at(-1)).toEqual(['', true]);
  });

  it('el periodo sale de la URL, marca el vigente y se pide con él', async () => {
    renderPage('/tutorados?periodo=p0');
    const select = await screen.findByRole('combobox', { name: 'Filtrar por periodo' });
    expect(select).toHaveValue('p0');
    expect(screen.getByRole('option', { name: '2026-II (vigente)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2026-I' })).toBeInTheDocument();
    expect(hookState.calls.at(-1)).toEqual(['p0', true]);
  });

  it('elegir un periodo lo pone en la URL, deja el ciclo en blanco y conserva lo demás; quitarlo lo borra', async () => {
    const user = userEvent.setup();
    renderPage('/tutorados?q=ana&ciclo=3');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filtrar por periodo' }), 'p1');
    const url = screen.getByLabelText('url');
    expect(url).toHaveTextContent('periodo=p1');
    expect(url).toHaveTextContent('q=ana');
    expect(url).not.toHaveTextContent('ciclo=3');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por periodo' }), '');
    expect(screen.getByLabelText('url')).not.toHaveTextContent('periodo=');
  });

  it('un periodo que no está en la lista (enlace antiguo) sigue seleccionado con un nombre genérico', async () => {
    renderPage('/tutorados?periodo=desconocido');
    expect(await screen.findByRole('combobox', { name: 'Filtrar por periodo' })).toHaveValue('desconocido');
    expect(screen.getByRole('option', { name: 'Periodo seleccionado' })).toBeInTheDocument();
  });

  it('con periodo, el ciclo que se muestra y se filtra es el que cursaban en él, no el actual', async () => {
    hookState.students = [
      student({ id: 's1', studentCode: '20240001', lastName: 'Ruiz', cycle: 3, periodCycle: 1 }),
      student({ id: 's2', studentCode: '20240002', lastName: 'Pérez', cycle: 5, periodCycle: 3 }),
    ];
    renderPage('/tutorados?periodo=p0&ciclo=1');
    expect(await screen.findByText('Ruiz', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Pérez', { exact: false })).not.toBeInTheDocument();
    // Las opciones de ciclo salen de los ciclos del periodo (1 y 3), no de los actuales (3 y 5).
    const cycleSelect = screen.getByRole('combobox', { name: /ciclo/i });
    expect(within(cycleSelect).getAllByRole('option').map((o) => o.textContent)).not.toContain('Ciclo 5');
  });

  it('un periodo sin matriculados lo dice y no ofrece registrar un estudiante', async () => {
    hookState.students = [];
    renderPage('/tutorados?periodo=p0');
    expect(await screen.findByText('Sin estudiantes matriculados en este periodo')).toBeInTheDocument();
    expect(screen.getByText(/revisa la matrícula en Carga de estudiantes/i)).toBeInTheDocument();
    // Queda solo el botón del encabezado: el aviso vacío no repite la acción de registrar.
    expect(screen.getAllByRole('button', { name: 'Nuevo estudiante' })).toHaveLength(1);
  });

  it('sin periodo y sin estudiantes mantiene el aviso de siempre con su acción', async () => {
    hookState.students = [];
    renderPage();
    expect(await screen.findByText('Aún no hay estudiantes registrados')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nuevo estudiante' })).toHaveLength(2);
  });

  it('si fallan los periodos avisa y deja reintentar sin ocultar la lista', async () => {
    const user = userEvent.setup();
    hookState.periodsError = true;
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los periodos.');
    expect(screen.getByText('Ruiz', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar periodos' }));
    expect(hookState.retryPeriods).toHaveBeenCalledTimes(1);
  });

  it('«Limpiar» también quita el periodo', async () => {
    const user = userEvent.setup();
    renderPage('/tutorados?periodo=p1');
    await user.click(await screen.findByRole('button', { name: /limpiar/i }));
    expect(screen.getByLabelText('url')).not.toHaveTextContent('periodo=');
  });
});
