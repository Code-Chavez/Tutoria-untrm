import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { certificateService } from '@features/certificados/services/certificateService';
import { TutorTeachersPage } from './TutorTeachersPage';
import { tutorTeacherService, type TutorTeacher } from '../services/tutorTeacherService';

vi.mock('../services/tutorTeacherService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/tutorTeacherService')>()),
  tutorTeacherService: { list: vi.fn() },
}));
vi.mock('@features/certificados/services/certificateService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/certificados/services/certificateService')>()),
  certificateService: { options: vi.fn(), start: vi.fn() },
}));

const teachers = vi.mocked(tutorTeacherService);
const certificates = vi.mocked(certificateService);

const teacher = (over: Partial<TutorTeacher> = {}): TutorTeacher => ({
  tutorId: 't1',
  tutorName: 'Docente Ficticio',
  schoolId: 's1',
  schoolName: 'Ingeniería de Sistemas',
  cycles: [{ cycle: 3, acceptance: 'ACEPTADA' }],
  acceptance: 'ACEPTADA',
  certificateId: null,
  certificateStatus: null,
  canStartCertificate: true,
  ...over,
});

const auth = (permissions: string[]): AuthContextValue => ({
  user: { id: 'u1', email: 'dbu@untrm.edu.pe', firstName: 'Ana', lastName: 'Directora', role: 'Rol a medida', permissions },
  isAuthenticated: true,
  isSessionFresh: true,
  login: vi.fn(),
  logout: vi.fn(),
  markPasswordChanged: vi.fn(),
});

function Probe() {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}`}</output>;
}

const renderPage = (permissions = ['certificados:consultar', 'certificados:registrar'], url = '/docentes-tutores') =>
  render(
    <AuthContext.Provider value={auth(permissions)}>
      <MemoryRouter initialEntries={[url]}>
        <QueryClientTestWrapper>
          <TutorTeachersPage />
          <Probe />
        </QueryClientTestWrapper>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const where = () => screen.getByTestId('where').textContent;

describe('TutorTeachersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    certificates.options.mockResolvedValue({
      periods: [{ id: 'p1', name: '2026-II', isActive: true }, { id: 'p0', name: '2026-I', isActive: false }],
      currentPeriodId: 'p1',
      schools: [{ id: 's1', name: 'Ingeniería de Sistemas' }, { id: 's2', name: 'Mecánica Eléctrica' }],
    });
    teachers.list.mockResolvedValue([
      teacher(),
      teacher({ tutorId: 't2', tutorName: 'Docente Sin Cargo', cycles: [], acceptance: 'SIN_ASIGNACION', canStartCertificate: false }),
      teacher({ tutorId: 't3', tutorName: 'Docente Pendiente', cycles: [{ cycle: 2, acceptance: 'PENDIENTE' }], acceptance: 'PENDIENTE', canStartCertificate: false }),
      teacher({ tutorId: 't4', tutorName: 'Docente En Trámite', certificateId: 'c9', certificateStatus: 'EN_REVISION', canStartCertificate: false }),
    ]);
  });

  it('muestra nombre, escuela, ciclos, estado de la designación y estado del trámite del periodo', async () => {
    renderPage();
    const row = (await screen.findByText('Docente Ficticio')).closest('tr') as HTMLElement;
    expect(within(row).getByText('Ingeniería de Sistemas')).toBeInTheDocument();
    expect(within(row).getByText('Ciclo 3: Aceptada')).toBeInTheDocument();
    expect(within(row).getByText('Sin trámite')).toBeInTheDocument();
    const inReview = screen.getByText('Docente En Trámite').closest('tr') as HTMLElement;
    expect(within(inReview).getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText(/Periodo 2026-II/)).toBeInTheDocument();
    expect(teachers.list).toHaveBeenCalledWith({ periodId: 'p1', schoolId: '', status: '', certificateStatus: '', q: '' });
  });

  it('distingue al docente sin asignación del que tiene la aceptación pendiente', async () => {
    renderPage();
    const none = (await screen.findByText('Docente Sin Cargo')).closest('tr') as HTMLElement;
    expect(within(none).getByText('Sin asignación')).toBeInTheDocument();
    expect(within(none).getByText('—')).toBeInTheDocument();
    const pending = screen.getByText('Docente Pendiente').closest('tr') as HTMLElement;
    expect(within(pending).getAllByText(/Pendiente de aceptar/).length).toBeGreaterThan(0);
    expect(within(pending).queryByText('Sin asignación')).not.toBeInTheDocument();
  });

  it('los filtros y la búsqueda se piden al servidor y viven en la URL', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Docente Ficticio');
    await user.selectOptions(screen.getByLabelText('Escuela profesional'), 's2');
    await user.selectOptions(screen.getByLabelText('Designación'), 'PENDIENTE');
    await user.selectOptions(screen.getByLabelText('Trámite de certificado'), 'SIN_TRAMITE');
    await user.type(screen.getByLabelText('Buscar por nombre'), 'ana');
    await waitFor(() => expect(teachers.list).toHaveBeenLastCalledWith({ periodId: 'p1', schoolId: 's2', status: 'PENDIENTE', certificateStatus: 'SIN_TRAMITE', q: 'ana' }));
    expect(where()).toContain('escuela=s2');
    expect(where()).toContain('estado=PENDIENTE');
    expect(where()).toContain('tramite=SIN_TRAMITE');
    expect(where()).toContain('q=ana');
  });

  it('una URL con valores que ya no existen se ignora', async () => {
    renderPage(undefined, '/docentes-tutores?periodo=nada&escuela=ajena&estado=INVENTADO&tramite=NADA');
    await screen.findByText('Docente Ficticio');
    expect(teachers.list).toHaveBeenCalledWith({ periodId: 'p1', schoolId: '', status: '', certificateStatus: '', q: '' });
  });

  it('«Ver trámite» abre el trámite en la pantalla de Certificados', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ver trámite de Docente En Trámite' }));
    expect(where()).toBe('/docentes-tutores?periodo=p1&escuela=s1&certificado=c9'.replace('/docentes-tutores', '/certificados'));
  });

  it('«Iniciar trámite» aparece solo con designación aceptada, sin trámite vigente y con permiso de registrar; al iniciarlo abre el trámite', async () => {
    const user = userEvent.setup();
    certificates.start.mockResolvedValue({ id: 'nuevo' } as never);
    renderPage();
    expect(await screen.findAllByRole('button', { name: /Iniciar trámite de/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Iniciar trámite de Docente Ficticio' }));
    await waitFor(() => expect(certificates.start).toHaveBeenCalledWith({ tutorId: 't1', periodId: 'p1', schoolId: 's1' }));
    await waitFor(() => expect(where()).toBe('/certificados?periodo=p1&escuela=s1&certificado=nuevo'));
  });

  it('una cuenta de solo consulta ve los datos pero no la acción de iniciar', async () => {
    renderPage(['certificados:consultar']);
    await screen.findByText('Docente Ficticio');
    expect(screen.queryByRole('button', { name: /Iniciar trámite de/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver trámite de Docente En Trámite' })).toBeInTheDocument();
  });

  it('si el servidor rechaza iniciar el trámite, lo dice y se queda en la lista', async () => {
    const user = userEvent.setup();
    certificates.start.mockRejectedValue(new Error('no se pudo'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Iniciar trámite de Docente Ficticio' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(where().startsWith('/docentes-tutores')).toBe(true);
  });

  it('sin resultados con filtros lo dice; sin filtros explica que no hay docentes', async () => {
    teachers.list.mockResolvedValue([]);
    renderPage(undefined, '/docentes-tutores?estado=VENCIDA');
    expect(await screen.findByText('Ningún docente coincide')).toBeInTheDocument();
  });
});
