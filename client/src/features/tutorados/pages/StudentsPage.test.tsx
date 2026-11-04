import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
vi.mock('../hooks/useStudents', () => ({
  useStudents: () => ({ students, schools: [{ id: 'sch1', name: 'Sistemas', facultyId: 'f1', isActive: true }], tutors: [], loading: false, error: false, refresh: vi.fn() }),
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
